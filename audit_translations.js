const fs = require('fs');
const path = require('path');

function getNestedKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys = keys.concat(getNestedKeys(obj[key], fullKey));
        }
    }
    return keys;
}

const arPath = path.join(__dirname, 'src/messages/ar.json');
const enPath = path.join(__dirname, 'src/messages/en.json');
const reportPath = path.join(__dirname, 'translation_final_audit.txt');

try {
    const arData = JSON.parse(fs.readFileSync(arPath, 'utf8'));
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    const arKeys = new Set(getNestedKeys(arData));
    const enKeys = new Set(getNestedKeys(enData));

    const onlyAr = [...arKeys].filter(k => !enKeys.has(k)).sort();
    const onlyEn = [...enKeys].filter(k => !arKeys.has(k)).sort();

    let report = `Final Translation Audit Report\n`;
    report += `==============================\n`;
    report += `Total Keys in Arabic: ${arKeys.size}\n`;
    report += `Total Keys in English: ${enKeys.size}\n\n`;

    report += `Missing in English (Only in Arabic):\n`;
    if (onlyAr.length === 0) report += ` - None. Perfect Match!\n`;
    else onlyAr.forEach(k => report += ` - ${k}\n`);

    report += `\nMissing in Arabic (Only in English):\n`;
    if (onlyEn.length === 0) report += ` - None. Perfect Match!\n`;
    else onlyEn.forEach(k => report += ` - ${k}\n`);

    fs.writeFileSync(reportPath, report);
    console.log('Audit completed. Please check translation_final_audit.txt');
} catch (err) {
    fs.writeFileSync(reportPath, 'Error during audit: ' + err.message);
}
