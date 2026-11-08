/* ===== Money Map core: parsing + categorising (pure functions, no DOM) ===== */
const CATS = [
  // --- money in ---
  // --- neither spending nor income ---
  {n:'Self Transfer', e:'🔄', k:'neutral', dir:'both', w:['=self','=to self','=from self','=self transfer','=self trf','own account','=own a c','=own acct','=own ac','=add money','=load money','=wallet load','=wallet topup','=wallet top up','=paytm wallet','=phonepe wallet','=mobikwik wallet']},
  {n:'Lent / Paid for Others', e:'🤲', k:'neutral', dir:'out', w:['=lent','=loan to','=udhar','=udhaar','=on behalf','=borrowed by','=hand loan']},
  {n:'Repaid to Me', e:'💸', k:'neutral', dir:'in', w:['=repaid','=repay','=repayment of loan','=returned','=return money','=udhar wapas','=udhaar wapas','=loan return','=returning']},
  {n:'Ignore', e:'🚫', k:'neutral', dir:'both', w:[]},
  {n:'Salary', e:'💼', k:'income', w:['salary','=sal','payroll','wages','stipend']},
  {n:'Interest', e:'🪙', k:'income', w:['interest','int pd','int paid','int cr','=int']},
  {n:'Reimbursements', e:'🔁', k:'offset', w:['reimburse','reimbursement','=reimb','=reimbt','=reimbursment','expense claim','=claim settlement','=travel claim','=medical claim','=conveyance','splitwise','=settle up','=split','=my share','=your share','=paid back','=payback']},
  {n:'Refunds & Cashback', e:'↩️', k:'offset', w:['refund','reversal','cashback','=rev','=rfnd']},
  {n:'Dividends', e:'💹', k:'income', w:['dividend','=div','=dvd','=interim div','=final div']},
  {n:'Investment Withdrawals', e:'📤', k:'withdraw', w:['redemption','=redeem','=redm','=rdm','=maturity','=matured','=mf','mutual fund','=cams','camsonline','kfintech','=kfin','=karvy','iccl','indian clearing','nse clearing','=nsccl','=bse','=bse ltd','zerodha','nextbillion','groww','rksv','upstox','=kuvera','paytm money','angel one','=dhan','=indmoney','=etmoney','=amc','fd closure','fd maturity','=fd close','=td closure','=closure proceeds','term deposit','fixed deposit','=rd closure','recurring deposit','=sbimf','hdfcmf','=ppfas','=nippon','=mirae','=axis mf','=icici pru mf','=sbi mutual','=hdfc mutual','=nps withdrawal','=ppf withdrawal','=withdrawal from ppf','=sale proceeds','=payout']},
  {n:'Money Received', e:'📥', k:'income', w:[]},
  // --- money out (order matters: first match wins) ---
  {n:'Investments', e:'📈', k:'invest', w:['nextbillion','rksv','=coin','indmoney','=nps trust','mutual funds','=amc','=sbimf','hdfcmf','icicipruamc','bse star','=ppfas','=nippon','=motilal','=kotak securities','=icici securities','sip','mutual fund','=mf','zerodha','groww','upstox','kuvera','paytm money','angel one','=nps','=ppf','recurring deposit','fixed deposit','iccl','indian clearing','=cams','kfintech','smallcase','=bse','=nse','=etmoney','et money','dhan']},
  {n:'Big Purchases', e:'🚗', k:'big', w:['=down payment','=downpayment','=booking amount','=margin money','=car booking','=vehicle booking']},
  {n:'Insurance', e:'🛡️', k:'expense', w:['life insurance','=bajaj allianz','=hdfc ergo','icici lombard','=new india assurance','insurance','=lic','policybazaar','hdfc life','icici pru','max life','star health','=acko','digit insur','tata aia','sbi life','care health','niva bupa']},
  {n:'Loan EMIs', e:'🏦', k:'expense', w:['home finance','=finance ltd','hdb financial','=tvs credit','=muthoot','=manappuram','loan repayment','=kreditbee','=moneyview','=navi','=emi','loan','bajaj fin','lending','=nach','=ecs']},
  {n:'Credit Card Bills', e:'💳', k:'expense', w:['dreamplug','=cc bill','=sbi card','=sbicard','creditcard','=cred','credit card','card payment','=cc','ccpay','card bill','cc payment']},
  {n:'Rent & Housing', e:'🏠', k:'expense', w:['=rent','house rent','nobroker','maintenance','society','landlord','magicbricks','nestaway']},
  {n:'Groceries', e:'🛒', k:'expense', w:['blink commerce','kiranakart','innovative retail','supermarket grocery','delightful gourmet','=bbnow','=bbdaily','=milk','dairy','=sabzi','=vegetables','=fruit','=nandini','amul','=mother dairy','=heritage','=akshayakalpa','=provision','provisions','=ratnadeep','=star bazaar','=nilgiris','=vishal mega','bigbasket','blinkit','grofers','zepto','instamart','dmart','avenue supermarts','jiomart','reliance fresh','reliance smart','more retail','spencer','natures basket','supermarket','grocery','grocer','kirana','dunzo','milkbasket','country delight','licious','freshtohome','fresh to home','vegetable','fruits']},
  {n:'Food & Dining', e:'🍽️', k:'expense', w:['bundl technologies','=eternal','zomato','=swiggy limited','=dine','=diner','=eatery','=canteen','=mess','=sweets','=snacks','=chai','=tiffin','=hotel','=bar','=pub','=brewery','=kitchen','=dosa','=idli','=chinese','=momo','=thali','=bhavan','=bhawan','=darshini','=udupi','=kfc','=wow momo','=third wave','=blue tokai','=burger','swiggy','zomato','eatsure','restaurant','=cafe','dominos','domino','mcdonald','=kfc','pizza','burger king','starbucks','=ccd','cafe coffee','chaayos','haldiram','barbeque','bakery','dhaba','=food','foods','faasos','box8','behrouz','subway','biryani','=tea','juice']},
  {n:'Subscriptions & Fun', e:'🎬', k:'expense', w:['bigtree','=jio hotstar','=apple','=icloud','=youtube premium','=amazon prime','=chatgpt','=openai','=anthropic','=claude','=linkedin','=microsoft','=adobe','=canva','=gaming','=dream11','=mpl','=zupee','netflix','spotify','hotstar','disney','prime video','amazon prime','youtube','bookmyshow','=pvr','inox','apple com','apple services','google play','sonyliv','zee5','jiocinema','jiohotstar','steam','playstation','audible','gaana','district']},
  {n:'Shopping', e:'🛍️', k:'expense', w:['fsn e','fashnear','flipkart internet','=amazon seller','amazon pay','=reliance trends','=reliance retail','=v mart','=zudio','=bata','=puma','=nike','=adidas','=boat','=apple store','=vijay sales','=poorvika','=sangeetha','=ajmal','=tanishq','=titan','=caratlane','=mobile','=mobiles','=electronics','=footwear','=garments','=textiles','=fashion','=jewellers','=jewellery','=optical','=stationery','amazon','flipkart','myntra','=ajio','meesho','nykaa','tata cliq','tatacliq','croma','reliance digital','lifestyle','westside','shoppers stop','=ikea','pantaloons','max fashion','=zara','lenskart','firstcry','snapdeal','=mall','trends','uniqlo','=h&m','purplle']},
  {n:'Travel', e:'✈️', k:'expense', w:['indian railway','=railway','=airport','=airlines','=makemytrip india','=easemytrip','=zoomcar','=tbo','makemytrip','goibibo','indigo','interglobe','air india','vistara','akasa','spicejet','irctc','cleartrip','=oyo','airbnb','booking com','yatra','ixigo','redbus','abhibus','=hotel','hotels','resort']},
  {n:'Transport & Fuel', e:'🚕', k:'expense', w:['ani technologies','roppen','=uber india','=auto','=cab','=taxi','=bmtc','=best bus','=ksrtc','=tsrtc','=msrtc','=apsrtc','=dmrc','=bmrcl','=petrol pump','=fuels','=filling','=service station','=hp petrol','=bharat petroleum','=nayara','=reliance bp','=jio bp','=fastag recharge','=ncmc','uber','=ola','olacabs','ola cabs','rapido','metro','fastag','petrol','fuel','=hpcl','=bpcl','=iocl','indian oil','hp pay','=shell','parking','namma yatri','blusmart','=toll','petroleum','filling station']},
  {n:'Bills & Utilities', e:'💡', k:'expense', w:['reliance jio','bharti airtel','=jio prepaid','=jio postpaid','=vodafone idea','=mobile recharge','=electricity board','=power','=water bill','=gas bill','=cylinder','=lpg','=piped gas','=dth recharge','=sun direct','=d2h','=excitel','=airtel xstream','=municipal','=property tax','=bbmp','=ghmc','=mcgm','electricity','bescom','tata power','adani elec','msedcl','=bses','=tneb','=kseb','=cesc','torrent power','=water','=gas','indane','bharat gas','=hp gas','mahanagar gas','=igl','broadband','act fibernet','hathway','=jio','airtel','vodafone','=vi','=bsnl','recharge','=dth','tata play','dish tv','=bill','billdesk','=bbps','postpaid','prepaid','=lpg']},
  {n:'Medical', e:'💊', k:'expense', w:['pharmacy','pharma','apollo','medplus','=1mg','pharmeasy','netmeds','hospital','clinic','diagnostic','=lab','labs','practo','medical','chemist','dental','dentist','healthians','=doctor','=dr lal','lal path','thyrocare','metropolis','api holdings','=1mg technologies','=medicals','=pharmacies','=medical store','=chemists','=hospitals','nursing home','=diagnostics','=pathology','=lab test','=physio','physiotherapy','=ayurveda','=ayurvedic','=homeopathy','=opd','=consultation','=medicine','=medicines','=scan','=x ray','=mri','=eye hospital','=eye care','=vaccination','=tata 1mg','=narayana','=manipal','=fortis','=max healthcare','=medanta','=aster','=cloudnine','=rainbow']},
  {n:'Fitness', e:'🏋️', k:'expense', w:['cult','curefit','=gym','=gymnasium','=fitness','=yoga','=sports','=sport','=decathlon','=swimming','=swim','=badminton','=tennis','=cricket academy','=football','=playo','=hudle','=zumba','=crossfit','=anytime fitness','=golds gym','=gold s gym','=snap fitness','=fitpass','=healthifyme','=protein','=supplements','=muscleblaze','=marathon','=cycling','=sports academy','=turf']},
  {n:'Education', e:'📚', k:'expense', w:['=school fee','=coaching','=classes','=library','=stationery','=coursera','=skillshare','=physicswallah','=pw','school','college','university','udemy','coursera','byju','unacademy','tuition','academy','institute','=exam','=books','=course']},
  {n:'Personal Care', e:'💇', k:'expense', w:['=urbanclap','=unisex','=beauty','=saloon','=hair','=makeover','=laundry','=dry clean','=drycleaners','=tailor','salon','=spa','urban company','urbanclap','barber','parlour','grooming']},
  {n:'Donations', e:'🙏', k:'expense', w:['donation','temple','charity','church','gurudwara','mosque','giveindia','ketto','milaap']},
  {n:'Family', e:'👪', k:'expense', w:['=family','=mom','=mummy','=mumma','=maa','=amma','=papa','=dad','=appa','=parents','=pocket money','=household','=ghar kharch','=home expenses','=for home','=sister','=brother','=didi','=bhaiya','=wife','=husband']},
  {n:'Local Shops & Merchants', e:'🏪', k:'expense', w:['=store','stores','=mart','=traders','=trader','=trading','enterprises','=enterprise','=agency','=agencies','=shop','=shoppe','general store','=kirana','=provision store','=emporium','=collections','=bhandar','=bazaar','=bazar','=centre','=center','=corner','=depot','=distributors','=wholesale','=retail','=supermarket','=hypermarket','& sons','=sons','=and sons','=co','=pvt','=private limited','=llp','=services','=solutions','=technologies','=ventures']},
  {n:'Cash Withdrawal', e:'🏧', k:'expense', w:['=csh wdl','=cash wdl','=atm wdl','=wdl atm','=atm','cash wdl','=nwd','cash withdrawal','=atw','cwdr','atm wdl']},
  {n:'Fees & Charges', e:'🧾', k:'expense', w:['=amc','atmcard amc','=debit card','=card charges','=sms charges','=chgs','=service charge','=cheque book','=consolidated charges','=non maintenance','=nmc','charges','=chrg','=chgs','=fee','=fees','penalty','=gst','sms alert','annual fee','min bal','=tds']},
  {n:'Sent to People', e:'🤝', k:'expense', w:[]},
  {n:'Other', e:'📦', k:'expense', w:[]},
];
const CAT_BY_NAME = Object.fromEntries(CATS.map(c => [c.n, c]));

function normText(s){ return ' ' + String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim() + ' '; }
function kwMatch(t, kw){
  const exact = kw[0] === '=';
  const k = normText(exact ? kw.slice(1) : kw).trim();
  if(!k) return false;
  return (exact || k.length <= 3) ? t.includes(' ' + k + ' ') : t.includes(' ' + k);
}
// signs that a UPI/card payment went to a business (QR codes, payment gateways, POS terminals), not a person
const MERCHANT_SIG = /paytmqr|bharatpe|bharat ?pe|\bq\d{6,}@|@?\bq\d{8,}|\.rzp@|razorpay|cashfree|\bp2m\b|\/p2m\/|merchant|mswipe|pine ?labs|ezetap|\bpos\b|\becom\b|\bpg\b|payu|billdesk|ccavenue|juspay|instamojo|phonepe ?merchant|gpay-1\d|\.paytm@|@paytm|ombk\.|@hdfcbank\b.*\bmer|yespay|@ikwik|mobikwik|\bpaytm\b(?!.*@ok)/i;
const TRANSFER_RE = /\b(upi|neft|imps|rtgs|ft|fund transfer|trf|tfr|transfer|p2a|p2p|mmt|inb|yono)\b/;

function autoCategory(desc, amount){
  const t = normText(desc);
  if(amount > 0){
    for(const c of CATS) if((c.k === 'income' || c.k === 'withdraw' || c.k === 'offset' || (c.k === 'neutral' && c.dir !== 'out')) && c.w.some(w => kwMatch(t, w))) return c.n;
    return 'Money Received';
  }
  // cash and bank charges first, so a shop word in the narration can't override them
  for(const n of ['Cash Withdrawal', 'Fees & Charges']) if(CAT_BY_NAME[n].w.some(w => kwMatch(t, w))) return n;
  for(const c of CATS) if(c.k !== 'income' && c.k !== 'withdraw' && c.k !== 'offset' && !(c.k === 'neutral' && c.dir === 'in') && c.w.some(w => kwMatch(t, w))) return c.n;
  const raw = String(desc || '').toLowerCase();
  if(MERCHANT_SIG.test(raw)) return 'Local Shops & Merchants';
  if(TRANSFER_RE.test(t)) return 'Sent to People';
  return 'Other';
}

const STOP = new Set(('tfr dep wdl csh cash deposit withdrawal by to of at mr mrs ms smt shri kum branch br inb yono imps neft rtgs int chq clg clearing ecs nach ach debit credit txn tran trn fund funds tpt self a/c ac acct account no upi atm dr cr p2a p2m p2p imps neft rtgs pos ecom ecs ach nach inb mb ib ibl net banking netbanking payment payments pay paid to from by transfer trf txn ref no ltd pvt private limited india the via mob mobile bil billpay online purchase debit credit card visa mastercard rupay wdl cash bank yesb hdfc hdfcbank icic icici sbin sbi utib axis kkbk kotak barb pnb punb ybl okaxis oksbi okicici okhdfcbank paytm apl axl collect request sent received na null payu razorpay razorpayx cashfree ccavenue juspay phonepe gpay googlepay mmt ft inr rs and for of tpt idfb indb fdrl cnrb ubin ioba mahb').split(' '));
function titleCase(s){ return s.replace(/\b([a-z])([a-z]*)/g, (m, a, b) => a.toUpperCase() + b); }
var merchantOf = function(desc){
  const parts = String(desc || '').split(/[\/\-\*|:@_#,;~]+|\s{2,}/);
  for(const p of parts){
    const words = p.toLowerCase().replace(/[^a-z0-9&.' ]+/g, ' ').split(/\s+/)
      .map(w => w.replace(/\.(com|in|co|net|org)$/, '').replace(/^\.+|\.+$/g, ''))
      .filter(w => w && !STOP.has(w.replace(/\./g, '')) && /[a-z]/.test(w) && !/\d{3,}/.test(w));
    // keep initials ("Rahul K" vs "Rahul S") but never start a name with a lone letter
    while(words.length && words[0].length === 1) words.shift();
    if(words.length){
      const name = words.slice(0, 3).join(' ');
      if(name.length >= 3) return titleCase(name);
    }
  }
  const ph = String(desc || '').match(/(\d{10})/);
  if(ph) return 'UPI …' + ph[1].slice(-4);
  return titleCase(String(desc || 'Unknown').toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24)) || 'Unknown';
}
// legal / payment names → the brand people recognise
const BRAND = [[/bundl|swiggy/i, 'Swiggy'], [/instamart/i, 'Swiggy Instamart'], [/eternal|zomato/i, 'Zomato'], [/blink ?commerce|blinkit|grofers/i, 'Blinkit'], [/kiranakart|zepto/i, 'Zepto'], [/ani technolog|olacabs|ola cabs/i, 'Ola'], [/roppen|rapido/i, 'Rapido'], [/uber/i, 'Uber'], [/innovative retail|supermarket grocery|bigbasket/i, 'BigBasket'], [/avenue supermarts|dmart/i, 'DMart'], [/bigtree|bookmyshow/i, 'BookMyShow'], [/dreamplug|cred\.club/i, 'CRED'], [/nextbillion|groww/i, 'Groww'], [/rksv|upstox/i, 'Upstox'], [/zerodha/i, 'Zerodha'], [/curefit|cult\.?fit/i, 'Cult.fit'], [/fsn e|nykaa/i, 'Nykaa'], [/fashnear|meesho/i, 'Meesho'], [/delightful gourmet|licious/i, 'Licious'], [/api holdings|pharmeasy/i, 'PharmEasy'], [/flipkart/i, 'Flipkart'], [/myntra/i, 'Myntra'], [/amazon/i, 'Amazon'], [/netflix/i, 'Netflix'], [/spotify/i, 'Spotify'], [/irctc|indian railway/i, 'IRCTC'], [/interglobe|indigo/i, 'IndiGo'], [/makemytrip/i, 'MakeMyTrip'], [/bharti airtel|airtel/i, 'Airtel'], [/reliance jio|jio ?(pre|post)paid/i, 'Jio'], [/urban ?company|urbanclap/i, 'Urban Company'], [/google ?play/i, 'Google Play']];
const _merchantOf = merchantOf;
merchantOf = function(desc){ for(const [re, name] of BRAND) if(re.test(desc || '')) return name; return _merchantOf(desc); };

/* ---------- dates & amounts ---------- */
const MONTHS = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
function pad(n){ return String(n).padStart(2, '0'); }
function mkDate(y, m, d){
  y = +y; m = +m; d = +d;
  if(y < 100) y += 2000;
  if(!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
function parseDate(v){
  if(v == null || v === '') return null;
  if(v instanceof Date && !isNaN(v)) return mkDate(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if(typeof v === 'number'){
    if(v > 20000 && v < 80000){ const d = new Date(Math.round((v - 25569) * 86400000)); return mkDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); }
    return null;
  }
  const s = String(v).trim();
  let m;
  if((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return mkDate(m[1], m[2], m[3]);
  if((m = s.match(/^(\d{1,2})[-\/. ](\d{1,2})[-\/. ](\d{2,4})(?!\d)/))) return mkDate(m[3], m[2], m[1]); // Indian: day first
  if((m = s.match(/^(\d{1,2})[-\/ ]?([A-Za-z]{3,9})[-\/ ,']*(\d{2,4})(?!\d)/))){ const mo = MONTHS[m[2].toLowerCase().slice(0, 4)] || MONTHS[m[2].toLowerCase().slice(0, 3)]; return mo ? mkDate(m[3], mo, m[1]) : null; }
  if((m = s.match(/^([A-Za-z]{3,9})[ .]+(\d{1,2}),?\s+(\d{4})/))){ const mo = MONTHS[m[1].toLowerCase().slice(0, 3)]; return mo ? mkDate(m[3], mo, m[2]) : null; }
  return null;
}
function parseAmount(v){
  if(v == null || v === '') return null;
  if(typeof v === 'number') return isFinite(v) ? {value: Math.abs(v), sign: v < 0 ? -1 : 0} : null;
  let s = String(v).trim();
  if(!s) return null;
  let sign = 0;
  if(/^\(.*\)$/.test(s) || /^-/.test(s) || /\bdr\.?\s*$/i.test(s)) sign = -1;
  else if(/\bcr\.?\s*$/i.test(s)) sign = 1;
  s = s.replace(/(cr|dr)\.?\s*$/i, '').replace(/[^0-9.]/g, '');
  if(!s || !/\d/.test(s)) return null;
  const n = parseFloat(s);
  return isFinite(n) ? {value: n, sign} : null;
}

/* ---------- CSV ---------- */
function parseCSV(text){
  text = text.replace(/^﻿/, '');
  const sample = text.split(/\r?\n/).slice(0, 40).join('\n');
  const delims = [',', ';', '\t', '|'];
  const delim = delims.map(d => [d, sample.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for(let i = 0; i < text.length; i++){
    const ch = text[i];
    if(q){
      if(ch === '"'){ if(text[i + 1] === '"'){ cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if(ch === '"') q = true;
    else if(ch === delim){ row.push(cell); cell = ''; }
    else if(ch === '\n' || ch === '\r'){ if(ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if(cell !== '' || row.length){ row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

/* ---------- table → transactions ---------- */
function hnorm(c){ return String(c == null ? '' : c).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
const H = {
  date: /(^| )(txn |tran |transaction |posting |post )?(date|dt)( |$)/,
  valueDate: /value/,
  desc: /narration|description|particular|details|remark|transaction details|merchant|payee|info/,
  type: /^(dr cr|cr dr|dr cr indicator|type|txn type|transaction type|debit credit|cr dr indicator)$/,
  debit: /withdraw|debit|(^| )dr( |$)|paid out|money out/,
  credit: /deposit|credit|(^| )cr( |$)|paid in|money in/,
  amount: /amount|amt|inr/,
  balance: /balance|(^| )bal( |$)/,
};
function findHeader(rows){
  for(let i = 0; i < Math.min(rows.length, 80); i++){
    const cells = rows[i].map(hnorm);
    const hasDate = cells.some(c => H.date.test(c) && c.length < 30);
    const hasDesc = cells.some(c => H.desc.test(c));
    const hasAmt = cells.some(c => H.debit.test(c) || H.credit.test(c) || H.amount.test(c));
    if(hasDate && hasDesc && hasAmt) return i;
  }
  return -1;
}
function mapColumns(header){
  const cells = header.map(hnorm), used = new Set(), col = {};
  const pick = (test) => { const i = cells.findIndex((c, i) => !used.has(i) && c && test(c)); if(i >= 0) used.add(i); return i; };
  col.date = pick(c => H.date.test(c) && !H.valueDate.test(c));
  if(col.date < 0) col.date = pick(c => H.date.test(c));
  col.balance = pick(c => H.balance.test(c));
  col.type = pick(c => H.type.test(c) || (/(^| )dr( |$)/.test(c) && /(^| )cr( |$)/.test(c) && c.length < 20));
  col.desc = pick(c => H.desc.test(c));
  col.ref = pick(c => /(^| )(ref|cheque|chq|instrument)( |$)/.test(c));
  col.debit = pick(c => H.debit.test(c) && !H.credit.test(c));
  col.credit = pick(c => H.credit.test(c) && !H.debit.test(c));
  col.amount = pick(c => H.amount.test(c));
  return col;
}
function rowsToTxns(rows){
  const h = findHeader(rows);
  if(h < 0) return {txns: [], error: "Couldn't find the transaction table (looked for Date, Description and Amount columns)."};
  let holder = null;
  for(let i = 0; i < h && !holder; i++){
    const r = rows[i].map(c => String(c == null ? '' : c).trim());
    for(let j = 0; j < r.length; j++){
      if(/^(account\s*(holder\s*)?name|customer\s*name|name)\s*:?\s*$/i.test(r[j])){
        const v = r.slice(j + 1).find(x => x && x !== ':');
        if(v) { holder = v.replace(/^:\s*/, ''); break; }
      }
      const m = r[j].match(/^(?:account\s*name|customer\s*name|name)\s*:\s*(.+)$/i);
      if(m){ holder = m[1]; break; }
    }
  }
  const col = mapColumns(rows[h]);
  if(col.date < 0 || col.desc < 0 || (col.debit < 0 && col.credit < 0 && col.amount < 0))
    return {txns: [], error: 'Found a table, but could not tell which columns hold the amounts.'};
  const txns = [];
  for(let i = h + 1; i < rows.length; i++){
    const r = rows[i];
    const date = parseDate(r[col.date]);
    if(!date){
      // multi-line narration in some exports: append to previous
      const extra = col.desc >= 0 ? String(r[col.desc] || '').trim() : '';
      if(extra && txns.length && !r.some((c, j) => j !== col.desc && String(c).trim())) txns[txns.length - 1].desc += ' ' + extra;
      continue;
    }
    let amount = null;
    if(col.debit >= 0 || col.credit >= 0){
      const d = col.debit >= 0 ? parseAmount(r[col.debit]) : null;
      const c = col.credit >= 0 ? parseAmount(r[col.credit]) : null;
      const dv = d ? d.value : 0, cv = c ? c.value : 0;
      if(dv || cv) amount = cv - dv;
      else if(col.amount >= 0){ const a = parseAmount(r[col.amount]); if(a) amount = a.sign < 0 ? -a.value : a.value; }
    } else {
      const a = parseAmount(r[col.amount]);
      if(a && a.value){
        let sign = a.sign;
        if(col.type >= 0){ const t = hnorm(r[col.type]); if(/^(dr|d|debit|withdrawal)/.test(t)) sign = -1; else if(/^(cr|c|credit|deposit)/.test(t)) sign = 1; }
        amount = sign < 0 ? -a.value : a.value;
      }
    }
    if(amount == null || !amount) continue;
    let desc = String(r[col.desc] == null ? '' : r[col.desc]).replace(/\s+/g, ' ').trim();
    const ref = col.ref >= 0 ? String(r[col.ref] == null ? '' : r[col.ref]).replace(/\s+/g, ' ').trim() : '';
    // SBI: "DEP TFR" / "WDL TFR" alone — the payee details sometimes sit in the Ref No. column
    if(ref && /[a-z]{3,}/i.test(ref) && !/[\/*@]/.test(desc) && desc.replace(/\b(dep|wdl|tfr|trf|to|by|transfer|csh|cash)\b/gi, '').trim().length < 4) desc = (desc + ' ' + ref).trim();
    desc = desc || '(no description)';
    if(/^(opening|closing) balance/i.test(desc)) continue;
    txns.push({date, desc, amount: Math.round(amount * 100) / 100});
  }
  if(!txns.length) return {txns, error: 'Found the table, but no transactions with valid dates and amounts.'};
  return {txns, holder};
}

/* ---------- PDF text lines → transactions (best effort) ---------- */
// lines: [{items:[{x, xc, str}]}] in reading order
const AMT_TOKEN = /^\(?-?(?:₹|rs\.?|inr)?\s*\d[\d,]*\.\d{2}\)?\s*(cr|dr)?\.?$/i;
const DATE_START = /^\s*(\d{1,2}[\/\-. ](?:\d{1,2}|[A-Za-z]{3,9})[\/\-. ,']*\d{2,4}(?!\d)|\d{4}-\d{2}-\d{2})/;
const DATE_ANY = /\b(\d{1,2}[\/\-.](?:\d{1,2}|[A-Za-z]{3})[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
function linesToTxnsLoose(lines){
  let cols = null, opening = null;
  const raw = []; let cur = null;
  for(const line of lines){
    // split items that contain several space-separated amounts at the end
    const items = [];
    for(const it of line.items){
      const parts = it.str.split(/\s{2,}/);
      if(parts.length > 1){ parts.forEach((p, k) => items.push({x: it.x + k, xc: it.xc + k, str: p.trim()})); }
      else items.push(it);
    }
    const text = items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
    const low = text.toLowerCase();
    if(/(withdraw|debit|\bdr\b)/.test(low) && /(deposit|credit|\bcr\b)/.test(low) && /balance/.test(low) && !DATE_START.test(text)){
      cols = {};
      for(const it of items){
        const s = it.str.toLowerCase();
        if(/balance/.test(s)) cols.balance = it.xc;
        else if(/withdraw|debit|^dr\.?$/.test(s)) cols.debit = it.xc;
        else if(/deposit|credit|^cr\.?$/.test(s)) cols.credit = it.xc;
      }
      if(cols.debit == null || cols.credit == null) cols = null;
      cur = null; continue;
    }
    const amts = items.filter(i => AMT_TOKEN.test(i.str));
    if(/opening balance|balance b\/?f|brought forward/.test(low) && amts.length){ const a = parseAmount(amts[amts.length - 1].str); if(a) opening = a.value; cur = null; continue; }
    const dm = text.match(DATE_START);
    const date = dm ? parseDate(dm[1]) : null;
    if(date){
      const firstAmtX = amts.length ? amts[0].x : Infinity;
      let desc = items.filter(i => i.x < firstAmtX && !AMT_TOKEN.test(i.str)).map(i => i.str).join(' ');
      desc = desc.replace(DATE_START, '').replace(DATE_ANY, ' ').replace(/\s+/g, ' ').trim();
      const t = {date, desc: desc || '(no description)', amt: null, sign: 0, bal: null};
      if(cols){
        for(const a of amts){
          const p = parseAmount(a.str); if(!p) continue;
          const dist = k => cols[k] == null ? Infinity : Math.abs(a.xc - cols[k]);
          const k = ['debit', 'credit', 'balance'].sort((x, y) => dist(x) - dist(y))[0];
          if(k === 'balance') t.bal = p.value;
          else if(p.value){ t.amt = p.value; t.sign = k === 'debit' ? -1 : 1; }
        }
      } else {
        const ps = amts.map(a => parseAmount(a.str)).filter(Boolean);
        if(ps.length >= 2){ t.bal = ps[ps.length - 1].value; t.amt = ps[ps.length - 2].value; t.sign = ps[ps.length - 2].sign; }
        else if(ps.length === 1){ t.amt = ps[0].value; t.sign = ps[0].sign; }
      }
      if(t.amt){ raw.push(t); cur = t; cur.cont = 0; }
      else { cur = t; cur.cont = 0; cur.pending = true; }
      continue;
    }
    if(cur && cur.pending && !amts.length && text.length < 120){ cur.desc += ' ' + text; continue; }
    if(cur && cur.pending && amts.length){
      cur.desc += ' ' + items.filter(i => !AMT_TOKEN.test(i.str)).map(i => i.str).join(' ');
      const ps = amts.map(a => parseAmount(a.str)).filter(Boolean);
      if(ps.length >= 2){ cur.bal = ps[ps.length - 1].value; cur.amt = ps[ps.length - 2].value; cur.sign = ps[ps.length - 2].sign; }
      else if(ps.length === 1){ cur.amt = ps[0].value; cur.sign = ps[0].sign; }
      if(cur.amt){ cur.pending = false; raw.push(cur); }
      continue;
    }
    // continuation of narration
    if(cur && !amts.length && !date && text.length < 90 && cur.cont < 3 && !/page|statement|balance|account|branch|customer|ifsc|total/i.test(text)){
      cur.desc += ' ' + text; cur.cont++;
    } else if(amts.length || date) cur = null;
  }
  if(!raw.length) return {txns: [], error: "Couldn't read transactions from this PDF. If your bank lets you, download the statement as Excel or CSV instead — it's much more reliable."};
  // resolve signs from running balance where columns were not detected
  const descending = raw.length > 1 && raw[0].date > raw[raw.length - 1].date;
  const seq = descending ? raw.slice().reverse() : raw;
  let prev = opening;
  for(const t of seq){
    if(!cols && t.bal != null && prev != null){
      const diff = t.bal - prev;
      if(Math.abs(Math.abs(diff) - t.amt) < 0.05) t.sign = diff < 0 ? -1 : 1;
    }
    if(t.bal != null) prev = t.bal;
  }
  // first row without an opening balance: infer from the next row
  if(!cols && seq.length > 1 && seq[0].bal != null && opening == null && seq[0].sign === 0){
    // nothing reliable to compare against; leave as debit by default
  }
  for(const t of seq){
    if(t.sign === 0){
      const d = ' ' + t.desc.toLowerCase() + ' ';
      if(/\bby (transfer|clearing|cash)|\/cr\/|[\s\-]cr[\s\-\/]|neft cr|imps cr|credit|deposit|salary|refund|reversal|interest|cashback/.test(d)) t.sign = 1;
      else t.sign = -1;
    }
  }
  const txns = raw.map(t => ({date: t.date, desc: t.desc.replace(/\s+/g, ' ').trim(), amount: Math.round((t.sign > 0 ? t.amt : -t.amt) * 100) / 100}));
  return {txns};
}


/* Column-aware PDF reader: finds the header row (Date … Debit / Credit / Balance),
   works out each column's position, then groups wrapped lines into one transaction.
   Handles SBI-style statements where dates ("1 Oct" / "2026") and UPI narrations wrap. */
function mergeHeaderItems(items){
  const out = [];
  for(const it of items){
    const last = out[out.length - 1];
    if(last && it.x - last.xr < 6 && !/balance|debit|credit|withdraw|deposit/i.test(it.str)){ last.str += ' ' + it.str; last.xr = it.xr; last.xc = (last.x + last.xr) / 2; }
    else out.push({x: it.x, xr: it.xr != null ? it.xr : it.xc * 2 - it.x, xc: it.xc, str: it.str});
  }
  return out;
}
function isHeaderLine(items){
  const t = items.map(i => i.str).join(' ');
  const low = t.toLowerCase();
  return /balance/.test(low) && /(withdraw|debit|\bdr\b)/.test(low) && /(deposit|credit|\bcr\b)/.test(low) && !DATE_START.test(t) && !items.some(i => AMT_TOKEN.test(i.str));
}
function detectColumns(items){
  const cols = [];
  for(const it of mergeHeaderItems(items)){
    const s = it.str.toLowerCase();
    let k = null;
    if(/balance/.test(s)) k = 'balance';
    else if(/withdraw|debit|^dr\.?$|paid out/.test(s)) k = 'debit';
    else if(/deposit|credit|^cr\.?$|paid in/.test(s)) k = 'credit';
    else if(/value/.test(s)) k = 'vdate';
    else if(/date|^dt\.?$/.test(s)) k = cols.some(c => c.k === 'date') ? 'vdate' : 'date';
    else if(/narration|description|particular|details|remark|transaction/.test(s)) k = 'desc';
    else if(/ref|cheque|chq|instrument/.test(s)) k = 'ref';
    if(k && !cols.some(c => c.k === k)) cols.push({k, x: it.x, xc: it.xc});
  }
  const has = k => cols.some(c => c.k === k);
  if(!has('debit') || !has('credit')) return null;
  if(!has('date')){ const minX = Math.min(...items.map(i => i.x)); cols.push({k: 'date', x: Math.min(minX, ...cols.map(c => c.x)) - 1, xc: minX}); cols.synthDate = true; }
  const sorted = cols.sort((a, b) => a.x - b.x); sorted.synthDate = cols.synthDate; return sorted;
}
function smartJoin(pieces){
  pieces = pieces.map(p => p.trim()).filter(Boolean);
  if(pieces.length < 2) return pieces[0] || '';
  const maxLen = Math.max(...pieces.map(p => p.length));
  let out = pieces[0];
  for(let i = 1; i < pieces.length; i++){
    const prev = pieces[i - 1];
    const tight = prev.length >= maxLen * 0.85 && maxLen >= 12 && /[A-Za-z0-9\/\-@.]$/.test(prev) && /^[A-Za-z0-9\/\-@.]/.test(pieces[i]);
    out += (tight ? '' : ' ') + pieces[i];
  }
  return out;
}
const ROW_START = /^\d{1,2}(?:[\s\/\-.]+(?:\d{1,2}|[A-Za-z]{3,9})|[A-Za-z]{3,9})/;
const FOOTER = /page\s*\d|page no|computer generated|does not require|signature|closing balance|opening balance|statement summary|total|carried forward|brought forward|b\/f|c\/f|customer care|toll free|please|disclaimer|registered office|www\.|\.com\b|gstin|ifsc|micr|branch/i;
function linesToTxns(lines){
  let cols = null, cur = null, opening = null;
  const raw = [];
  const finish = () => { if(cur){ raw.push(cur); cur = null; } };
  for(let li = 0; li < lines.length; li++){
    const line = lines[li];
    const items = line.items;
    const text = items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
    let c = null;
    if(isHeaderLine(items)){
      // header cells often wrap ("Txn" / "Date", "Ref No./" / "Cheque No."): pull in nearby text-only lines
      c = detectColumns(items);
      if(!c || c.synthDate){
        // header cells may wrap ("Txn" / "Date"): borrow only header-like words from the lines right next to it
        const HW = /^(txn|tran|transaction|post(ing)?|value|date|dt\.?|narration|description|particulars?|details|remarks|ref\.?|no\.?|ref ?no\.?|cheque|chq\.?|ref no\.?\/cheque|no\.?\/cheque|debit|credit|withdrawals?|deposits?|balance|amount|dr|cr)[\s.\/:]*$/i;
        const near = [];
        for(let j = Math.max(0, li - 2); j <= Math.min(lines.length - 1, li + 2); j++){
          if(j === li) continue;
          const its = lines[j].items;
          if(its.length && its.every(i => HW.test(i.str.trim()) || i.str.trim().split(/\s+/).every(w => HW.test(w)))) near.push(...its);
        }
        if(near.length) c = detectColumns(items.concat(near).sort((a, b) => a.x - b.x)) || c;
      }
    }
    if(c){ finish(); cols = c; continue; }
    if(/opening balance|balance b\/?f|brought forward/i.test(text)){
      const a = items.filter(i => AMT_TOKEN.test(i.str)); if(a.length){ const p = parseAmount(a[a.length - 1].str); if(p) opening = p.value; }
      finish(); continue;
    }
    if(!cols) continue;
    // assign each item to a column
    const cell = {};
    const amtCols = cols.filter(c => c.k === 'debit' || c.k === 'credit' || c.k === 'balance');
    for(const it of items){
      let k;
      if(AMT_TOKEN.test(it.str)){
        const xr = it.xr != null ? it.xr : it.xc * 2 - it.x;
        // numbers are right-aligned: the column whose span contains the number's right edge wins
        let span = null;
        for(let ci = 0; ci < cols.length; ci++){ const nx = ci + 1 < cols.length ? cols[ci + 1].x : Infinity; if(xr > cols[ci].x - 4 && xr <= nx + 4) span = cols[ci]; }
        if(span && (span.k === 'debit' || span.k === 'credit' || span.k === 'balance')) k = span.k;
        else k = amtCols.slice().sort((a, b) => Math.abs(it.xc - a.xc) - Math.abs(it.xc - b.xc))[0].k;
        // an amount that sits well left of every amount column is part of the text
        const firstAmtX = Math.min(...amtCols.map(c => c.x));
        if(it.xc < firstAmtX - 40) k = null;
      }
      if(!k){
        let col = cols[0];
        for(const c of cols) if(it.x >= c.x - 12) col = c;
        k = col.k;
        if(k === 'debit' || k === 'credit' || k === 'balance'){
          // non-amount text in an amount column (e.g. "-" or "CR") — ignore
          if(!/^(cr|dr)\.?$/i.test(it.str)) continue;
        }
      }
      (cell[k] = cell[k] || []).push(it.str);
    }
    const dateTxt = (cell.date || []).join(' ').trim();
    const startsRow = ROW_START.test(dateTxt);
    if(startsRow){
      finish();
      cur = {date: [dateTxt], desc: [], ref: [], debit: [], credit: [], balance: []};
      for(const k of ['desc', 'ref', 'debit', 'credit', 'balance']) if(cell[k]) cur[k].push(cell[k].join(' '));
      continue;
    }
    if(!cur) continue;
    if(FOOTER.test(text) && !(cell.desc && !cell.date && !FOOTER.test(cell.desc.join(' ')))){ finish(); continue; }
    if(dateTxt) cur.date.push(dateTxt);
    for(const k of ['desc', 'ref', 'debit', 'credit', 'balance']) if(cell[k]) cur[k].push(cell[k].join(' '));
    if(cur.desc.length > 8) finish();   // runaway: something isn't a table row
  }
  finish();
  const txns = [];
  const amt = arr => { for(const s of arr){ const p = parseAmount(s); if(p && p.value) return p; } return null; };
  for(const r of raw){
    const date = parseDate(r.date.join(' ').replace(/\s+/g, ' ')) || parseDate(r.date.join(''));
    if(!date) continue;
    const d = amt(r.debit), cr = amt(r.credit), bal = amt(r.balance);
    let amount = null;
    if(d && !cr) amount = -d.value;
    else if(cr && !d) amount = cr.value;
    else if(d && cr) amount = cr.value - d.value;
    if(!amount) continue;
    const spaced = r.desc.map(x => x.trim()).filter(Boolean).join(' ');
    const desc = spaced || smartJoin(r.ref) || '(no description)';
    const glued = r.desc.map(x => x.trim()).filter(Boolean).join('');   // for words split mid-way ("swiggy@y" + "esbank")
    txns.push({date, desc, alt: glued && glued !== desc ? glued : undefined, amount: Math.round(amount * 100) / 100, bal: bal ? bal.value : null});
  }
  // sanity check signs against the running balance (fixes swapped Debit/Credit columns)
  const seq = txns.length > 1 && txns[0].date > txns[txns.length - 1].date ? txns.slice().reverse() : txns;
  // the running balance is the ground truth: if balance moved up by exactly this amount, it was money in
  let prev = opening, agree = 0, disagree = 0;
  for(const t of seq){
    if(t.bal != null && prev != null){
      const diff = Math.round((t.bal - prev) * 100) / 100;
      if(Math.abs(diff - t.amount) < 0.05) agree++;
      else if(Math.abs(diff + t.amount) < 0.05){ disagree++; t.amount = -t.amount; }
    }
    if(t.bal != null) prev = t.bal;
  }
  // first row has no previous balance: if the whole statement had its columns swapped, flip it too
  if(disagree > agree * 2 && disagree >= 3 && seq[0] && opening == null) seq[0].amount = -seq[0].amount;
  txns.forEach(t => { delete t.bal; if(!t.alt) delete t.alt; });
  if(txns.length) return {txns};
  return linesToTxnsLoose(lines);
}

/* Privacy-safe layout report: keeps positions and the *shape* of text, never the content. */
const HEADER_WORDS = /^(txn|tran|transaction|value|date|dt|description|narration|particulars|details|remarks|ref|no|cheque|chq|debit|credit|withdrawal|deposit|balance|amount|dr|cr|amt|page|opening|closing|of|\.|\/)+$/i;
function layoutReport(lines){
  const shape = s => {
    if(DATE_START.test(s) && s.length < 14) return s.replace(/\d/g, '9');
    if(AMT_TOKEN.test(s)) return /cr\.?$/i.test(s) ? '[amount] Cr' : /dr\.?$/i.test(s) ? '[amount] Dr' : '[amount]';
    const words = s.split(/\s+/);
    return words.map(w => HEADER_WORDS.test(w.replace(/[^A-Za-z.\/]/g, '')) && /[A-Za-z]/.test(w) ? w : w.replace(/[A-Za-z]/g, 'a').replace(/\d/g, '9')).join(' ').slice(0, 60);
  };
  return lines.slice(0, 140).map(l => l.items.map(i => `${Math.round(i.x)}:${shape(i.str)}`).join(' | ')).join('\n');
}

if(typeof module !== 'undefined') module.exports = {CATS, autoCategory, merchantOf, parseDate, parseAmount, parseCSV, rowsToTxns, linesToTxns, layoutReport};
