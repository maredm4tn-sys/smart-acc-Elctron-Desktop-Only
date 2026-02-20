const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'src/messages/ar.json');
const enPath = path.join(__dirname, 'src/messages/en.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

console.log("ar.Reports.BalanceSheet:", typeof (ar.Reports && ar.Reports.BalanceSheet));
console.log("en.Reports.BalanceSheet:", typeof (en.Reports && en.Reports.BalanceSheet));
console.log("Object keys in ar.Reports.BalanceSheet:");
if (ar.Reports && ar.Reports.BalanceSheet) console.log(Object.keys(ar.Reports.BalanceSheet));
