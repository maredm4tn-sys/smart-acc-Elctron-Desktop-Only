const fs = require('fs');
const path = require('path');

const AR_PATH = path.join(__dirname, 'src', 'messages', 'ar.json');
const EN_PATH = path.join(__dirname, 'src', 'messages', 'en.json');

function readJson(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return Object.entries(JSON.parse(content));
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
        return [];
    }
}

function writeJson(filePath, dataObj) {
    const formatted = JSON.stringify(dataObj, null, 4);
    fs.writeFileSync(filePath, formatted, 'utf8');
}

// Deep merge helper that preserves order of source where possible
function syncKeys(sourceObj, targetObj, sourceLang, targetLang) {
    const newTarget = { ...targetObj };
    let changed = false;

    for (const [key, value] of Object.entries(sourceObj)) {
        if (targetObj[key] === undefined) {
             console.log(`[Missing in ${targetLang}] Added key: ${key}`);
             
             // If the value is an object, copy the whole object
             if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                 newTarget[key] = syncKeys(value, {}, sourceLang, targetLang).synced;
             } else {
                 if (targetLang === 'ar') newTarget[key] = value + " (مترجم)";
                 else newTarget[key] = "[EN] " + value;
             }
             changed = true;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
             // It exists but is an object, we need to go deeper
             if (typeof targetObj[key] === 'object' && targetObj[key] !== null && !Array.isArray(targetObj[key])) {
                 const result = syncKeys(value, targetObj[key], sourceLang, targetLang);
                 if (result.changed) {
                     newTarget[key] = result.synced;
                     changed = true;
                 }
             } else {
                 // Type mismatch, overwrite target with source structure
                 console.log(`[Mismatch in ${targetLang}] Overwriting non-object key: ${key}`);
                 newTarget[key] = syncKeys(value, {}, sourceLang, targetLang).synced;
                 changed = true;
             }
        }
    }
    return { synced: newTarget, changed };
}


function main() {
    console.log("Starting Safe Two-Way Sync...");
    targetAr = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));
    targetEn = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
    
    // 1. Sync AR -> EN (Find what's in AR but missing in EN)
    console.log("--- Syncing AR keys to EN ---");
    const enResult = syncKeys(targetAr, targetEn, 'ar', 'en');
    
    // 2. Sync EN -> AR (Find what's in EN but missing in AR)
    console.log("\n--- Syncing EN keys to AR ---");
    const arResult = syncKeys(targetEn, targetAr, 'en', 'ar');

    // 3. Write back ONLY if changes occurred to avoid formatting churn
    if (enResult.changed) {
        writeJson(EN_PATH, enResult.synced);
        console.log("✅ Updated en.json successfully.");
    } else {
        console.log("✅ en.json is already up to date.");
    }

    if (arResult.changed) {
        writeJson(AR_PATH, arResult.synced);
        console.log("✅ Updated ar.json successfully.");
    } else {
        console.log("✅ ar.json is already up to date.");
    }
    
    console.log("\n🚀 Sync Complete! All nested keys are perfectly matched.");
}

main();
