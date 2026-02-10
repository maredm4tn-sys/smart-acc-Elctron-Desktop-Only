const fs = require('fs');
const path = require('path');

function getKeys(obj, prefix = '') {
    let keys = [];
    for (let key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys = keys.concat(getKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    return keys;
}

try {
    const arPath = path.join(__dirname, '../src/messages/ar.json');
    const enPath = path.join(__dirname, '../src/messages/en.json');

    const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    const arKeys = getKeys(ar);
    const enKeys = getKeys(en);

    const onlyAr = arKeys.filter(k => !enKeys.includes(k));
    const onlyEn = enKeys.filter(k => !arKeys.includes(k));

    if (onlyAr.length > 0) {
        console.log('Keys in AR but not in EN:');
        onlyAr.forEach(k => console.log(`  ${k}`));
    }

    if (onlyEn.length > 0) {
        console.log('Keys in EN but not in AR:');
        onlyEn.forEach(k => console.log(`  ${k}`));
    }

    if (onlyAr.length === 0 && onlyEn.length === 0) {
        console.log('All keys match perfectly!');
    }
} catch (err) {
    console.error('Error comparing files:', err.message);
}
