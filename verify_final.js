const fs = require('fs');

const ar = JSON.parse(fs.readFileSync('src/messages/ar.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/messages/en.json', 'utf8'));

console.log("--- Sidebar Check ---");
console.log("AR Sidebar keys:", Object.keys(ar.Sidebar));
console.log("EN Sidebar keys:", Object.keys(en.Sidebar));

const missingInAr = Object.keys(en.Sidebar).filter(k => !ar.Sidebar[k]);
const missingInEn = Object.keys(ar.Sidebar).filter(k => !en.Sidebar[k]);

if (missingInAr.length > 0) console.log("Missing in AR:", missingInAr);
if (missingInEn.length > 0) console.log("Missing in EN:", missingInEn);

console.log("\n--- Integrity Check ---");
if (ar.PartnersManagement && en.PartnersManagement) console.log("PartnersManagement: EXISTS in both");
if (ar.EmployeesManagement && en.EmployeesManagement) console.log("EmployeesManagement: EXISTS in both");
