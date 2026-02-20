const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'src/messages/ar.json');
const enPath = path.join(__dirname, 'src/messages/en.json');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

console.log("Checking ar.json Reports.TrialBalance:");
console.log(ar.Reports && ar.Reports.TrialBalance ? typeof ar.Reports.TrialBalance : "Not found or undefined");

console.log("Checking en.json Reports.TrialBalance:");
console.log(en.Reports && en.Reports.TrialBalance ? typeof en.Reports.TrialBalance : "Not found or undefined");

console.log("Is it possible that TrialBalance is inside Statements instead?");
console.log("AR:", ar.Reports && ar.Reports.Statements ? ar.Reports.Statements.TrialBalance : "No");

console.log("Any other top level TrialBalance?");
console.log(ar.TrialBalance ? "Yes" : "No");
