# Money Map

A personal finance tracker for Indian bank statements. Add your statement (Excel, CSV or PDF, password-protected is fine) and see where your money goes: categories, needs vs wants, a money health score, trends, recurring payments.

**Open the app:** https://manoranjanminz.github.io/money-map/

## Private by design
- Statements are read **on your device**. Nothing is uploaded, and there is no bank login and no SMS reading.
- Data is stored in your browser on that device only. Use ⚙️ Settings → **Download backup** now and then, and **Restore from backup** to move to another phone or computer.

## Install it on your phone
- **iPhone:** open the link in Safari → Share → **Add to Home Screen**.
- **Android:** open the link in Chrome → tap **📲 Install** (or Chrome menu ⋮ → Install app). On Android you can also share a statement from Gmail or Files straight to Money Map.

Once installed it opens full-screen and works offline.

## What it understands
- SBI, HDFC, Kotak and similar layouts: `WDL TFR` / `DEP TFR` codes, wrapped PDF rows, Excel exports that are really text files.
- UPI narrations, company legal names (Bundl → Swiggy, Kiranakart → Zepto, ANI → Ola), shop QR codes vs. people.
- Salary paid in the first week counts for the previous month. Reimbursements, refunds, self-transfers, lending, fund withdrawals and big one-off purchases are kept out of spending and income.

## For development
| Path | What it is |
|---|---|
| `index.html` | The whole app (UI, with `src/core.js` and `src/officecrypto.js` bundled in) |
| `src/core.js` | Statement parsing and categorising, no browser needed |
| `src/officecrypto.js` | Opens password-protected .xlsx files in the browser (WebCrypto) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable app: offline cache, home-screen icon, share target |
| `tests/` | `node --test tests/core.test.js` (runs automatically on every push) |

When changing the app, bump `VERSION` in `sw.js` so installed copies pick up new icons and files.
