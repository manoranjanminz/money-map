// Run with: node --test tests/core.test.js  (from the repository root)
const test = require('node:test'), assert = require('node:assert');
const c = require('../src/core.js');
const cat = (d, a) => c.autoCategory(d, a);

test('HDFC CSV: columns, amounts, merchants, categories', () => {
  const csv = `HDFC BANK Ltd.\nDate,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/10/26,NEFT CR-HDFC0001234-ACME TECHNOLOGIES PVT LTD-SALARY OCT,000123,01/10/26,,"85,000.00","1,02,000.00"
02/10/26,UPI-SWIGGY-swiggy@yesbank-YESB0000001-427512345678-Order,4275,02/10/26,456.00,,"1,01,544.00"
06/10/26,POS 4123XXXXXX1234 DMART AVENUE SUPERMARTS,,06/10/26,"1,890.50",,"84,653.50"`;
  const r = c.rowsToTxns(c.parseCSV(csv));
  assert.deepStrictEqual(r.txns.map(t => [t.date, t.amount]), [['2026-10-01', 85000], ['2026-10-02', -456], ['2026-10-06', -1890.5]]);
  assert.strictEqual(cat(r.txns[0].desc, 85000), 'Salary');
  assert.strictEqual(c.merchantOf(r.txns[1].desc), 'Swiggy');
  assert.strictEqual(cat(r.txns[2].desc, -1890.5), 'Groceries');
});

test('Kotak single amount + Dr/Cr column', () => {
  const r = c.rowsToTxns(c.parseCSV(`Sl. No.,Transaction Date,Description,Chq / Ref No.,Amount,Dr / Cr,Balance\n1,02-10-2026,UPI/UBER INDIA/4275/Ride,UPI-4275,245.00,DR,"9,755.00"\n2,03-10-2026,Amazon Pay Refund,REF,"1,299.00",CR,"11,054.00"`));
  assert.deepStrictEqual(r.txns.map(t => t.amount), [-245, 1299]);
});

test('SBI Excel: TFR codes, details in Ref column, account holder', () => {
  const rows = [['Account Name', ':', 'MR MANORANJAN MINZ'], ['Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Debit', 'Credit', 'Balance'],
    ['1 Oct 2026', '1 Oct 2026', 'DEP TFR', 'UPI/CR/5123/PRIYA SHARMA/HDFC/priya@okhdfcbank', '', '1,400.00', '10,000.00'],
    ['2 Oct 2026', '2 Oct 2026', 'WDL TFR UPI/DR/5124/BUNDL TECHNOLOGIES/YESB/swiggy@yesbank', '', '420.00', '', '9,580.00']];
  const r = c.rowsToTxns(rows);
  assert.strictEqual(r.holder, 'MR MANORANJAN MINZ');
  assert.strictEqual(c.merchantOf(r.txns[0].desc), 'Priya Sharma');
  assert.strictEqual(c.merchantOf(r.txns[1].desc), 'Swiggy');
});

test('merchant names keep initials and map legal names to brands', () => {
  assert.strictEqual(c.merchantOf('WDL TFR UPI/DR/5101/RAHUL K/SBIN/rahul@oksbi/Payment'), 'Rahul K');
  assert.strictEqual(c.merchantOf('WDL TFR UPI/DR/5101/KIRANAKART TECH/YESB/zeptonow@ybl'), 'Zepto');
  assert.strictEqual(c.merchantOf('WDL TFR UPI/DR/5101/ANI TECHNOLOGIES/YESB/olacabs@ybl'), 'Ola');
});

test('categories for tricky narrations', () => {
  const cases = [
    ['WDL TFR UPI/DR/5123/SRI LAKSHMI GENERAL STORES/YESB/paytmqr2810050@paytm/Payment', -100, 'Local Shops & Merchants'],
    ['WDL TFR UPI/DR/5123/RAHUL KUMAR/SBIN/rahul@oksbi/Payment', -100, 'Sent to People'],
    ['WDL TFR UPI/DR/5123/SURESH/SBIN/s@oksbi/rent', -15000, 'Rent & Housing'],
    ['DEP TFR NEFT*HDFC0000240*CAMS*HDFC MUTUAL FUND REDEMPTION', 200000, 'Investment Withdrawals'],
    ['DEP TFR UPI/CR/5105/PRIYA SHARMA/HDFC/priya@okhdfcbank/Dinner split', 1400, 'Reimbursements'],
    ['WDL TFR UPI/DR/5101/RAHUL K/SBIN/rahul@oksbi/lent', -5000, 'Lent / Paid for Others'],
    ['DEP TFR UPI/CR/5102/RAHUL K/SBIN/rahul@oksbi/returning', 5000, 'Repaid to Me'],
    ['CSH WDL ATM 12345 KORAMANGALA', -2000, 'Cash Withdrawal'],
    ['DEBIT-ATMCard AMC 123456*1234 CLASSIC', -236, 'Fees & Charges'],
    ['WDL TFR UPI/DR/5101/APOLLO PHARMACY/YESB/apollo@ybl', -300, 'Medical'],
    ['WDL TFR UPI/DR/5101/CUREFIT HEALTHCARE/YESB/cult@ybl', -1500, 'Fitness'],
  ];
  for(const [d, a, want] of cases) assert.strictEqual(cat(d, a), want, d);
});

test('PDF: realistic 3-page SBI statement with wrapped cells', () => {
  const lines = require('./fixtures/sbi_pdf_lines.json'), exp = require('./fixtures/sbi_pdf_expected.json');
  const r = c.linesToTxns(lines);
  assert.strictEqual(r.txns.length, exp.length);
  exp.forEach(([d, a], i) => { assert.strictEqual(r.txns[i].date, d); assert.ok(Math.abs(r.txns[i].amount - a) < 0.01, `row ${i}`); });
  assert.strictEqual(c.merchantOf(r.txns[2].desc), 'Rahul Kumar');
  assert.strictEqual(c.merchantOf(r.txns[0].desc), 'Acme Technologies');
});

test('dates in Indian formats', () => {
  assert.strictEqual(c.parseDate('01/10/26'), '2026-10-01');
  assert.strictEqual(c.parseDate('1 Oct 2026'), '2026-10-01');
  assert.strictEqual(c.parseDate('01-Oct-2026'), '2026-10-01');
  assert.strictEqual(c.parseDate('2026-10-01'), '2026-10-01');
  assert.strictEqual(c.parseDate(46296), '2026-10-01');
});
