const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'src/messages/ar.json');
const enPath = path.join(__dirname, 'src/messages/en.json');

function findDuplicates(content) {
    const lines = content.split('\n');
    const keys = new Set();
    const duplicates = [];

    // Simple regex to find "key": val
    // This is not perfect for nested structures but helps find direct duplicates in same scope if formatted well
    // A better approach for JSON duplicates is using a parser that supports it or just tokenizing
    // Let's use a regex that captures keys at the start of the line (assuming formatting)

    // Actually, let's use a regex that finds all keys and their positions
    const regex = /"([^"]+)"\s*:/g;
    let match;
    const allKeys = [];

    while ((match = regex.exec(content)) !== null) {
        allKeys.push(match[1]);
    }

    // This approach is too broad because it flattens the structure.
    // A key "Name" can exist in "Account" and "User".
    // We need to track path.

    // Let's try to parse manually or use a strict parser if available. 
    // Since we don't have a strict parser lib, let's look for adjacent duplicates or same-scope duplicates.
    // But wait, the file is formatted with indentation.
    // We can track indentation level to guess scope? 
    // No, that's flaky.

    // Alternative: Use `json-source-map` logic if we could, but we can't install packages.
    // Let's go with a simpler check:
    // Read the file line by line. Count occurrences of "key": in the whole file? No.
    // How about we just check if `JSON.parse` fails? (It doesn't for duplicates, usually).

    // Let's just find keys that appear more times than expected? No.
}

// Improved Duplicate Detection:
// We will use a stack-based parser to track the current path and detect duplicate keys at the SAME path.
function detectDuplicates(jsonString) {
    let index = 0;
    const stack = []; // Stores current object keys to check for duplicates
    const duplicates = [];

    // This is a simplified state machine. 
    // We'll rely on the fact that the file is well-formatted JSON.
    // We want to find "key": value pairs.

    // Let's use a recursive function approach that 'parses' the object and reports duplicates.
    // But writing a full JSON parser is complex.

    // simpler hack:
    // Use `JSON.parse` with a reviver function?
    // The reviver function is called *after* parsing, so duplicates are already merged.

    // CORRECT APPROACH:
    // Use a regex to find all keys, but we need context.
    // However, since we are in a node environment, maybe we can use specific flags? No.

    // Let's try this:
    // We will scan the file for keys.
    // Use a regex `/"((?:[^"\\]|\\.)*)"\s*:/g` to find all keys.
    // For each key found, we check if it was already seen *within the current object scope*.
    // Keeping track of scope (opening/closing braces) is key.

    const errors = [];
    const scopeStack = [new Set()]; // Stack of Sets, each Set contains keys for that object scope

    // Helper to tokenize
    let line = 1;
    let col = 0;

    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (char === '\n') { line++; col = 0; continue; }
        col++;

        if (char === '{') {
            scopeStack.push(new Set());
        } else if (char === '}') {
            scopeStack.pop();
        } else if (char === '"') {
            // Potential key or string value
            // Check if it is a key (followed by :)
            // We need to skip the string content
            let stringEnd = i + 1;
            while (stringEnd < jsonString.length) {
                if (jsonString[stringEnd] === '"' && jsonString[stringEnd - 1] !== '\\') break;
                stringEnd++;
            }

            const str = jsonString.substring(i + 1, stringEnd);

            // update i
            const keyStartForReport = i;
            i = stringEnd; // now at closing quote

            // Check what comes next (ignoring whitespace)
            let j = i + 1;
            let isKey = false;
            while (j < jsonString.length) {
                const c = jsonString[j];
                if (c === ' ' || c === '\n' || c === '\r' || c === '\t') {
                    j++;
                } else if (c === ':') {
                    isKey = true;
                    break;
                } else {
                    break;
                }
            }

            if (isKey) {
                // It's a key!
                const currentScope = scopeStack[scopeStack.length - 1];
                if (currentScope.has(str)) {
                    errors.push(`Duplicate key "${str}" found at line ${line} (approx)`);
                } else {
                    currentScope.add(str);
                }
            }
        }
    }
    return errors;
}

function compareObjects(obj1, obj2, path = '', results = { missingInEn: [], missingInAr: [] }) {
    // Check keys in obj1
    for (const key in obj1) {
        const currentPath = path ? `${path}.${key}` : key;
        if (!(key in obj2)) {
            results.missingInEn.push(currentPath);
        } else {
            if (typeof obj1[key] === 'object' && obj1[key] !== null && typeof obj2[key] === 'object' && obj2[key] !== null) {
                compareObjects(obj1[key], obj2[key], currentPath, results);
            }
        }
    }

    // Check keys in obj2
    for (const key in obj2) {
        const currentPath = path ? `${path}.${key}` : key;
        if (!(key in obj1)) {
            results.missingInAr.push(currentPath);
        }
    }

    return results;
}

try {
    const arContent = fs.readFileSync(arPath, 'utf8');
    const enContent = fs.readFileSync(enPath, 'utf8');

    console.log("--- Checking for duplicates in ar.json ---");
    const arDups = detectDuplicates(arContent);
    if (arDups.length) arDups.forEach(d => console.log(d));
    else console.log("No duplicates found in ar.json");

    console.log("\n--- Checking for duplicates in en.json ---");
    const enDups = detectDuplicates(enContent);
    if (enDups.length) enDups.forEach(d => console.log(d));
    else console.log("No duplicates found in en.json");

    console.log("\n--- Comparing structure ---");
    const arObj = JSON.parse(arContent);
    const enObj = JSON.parse(enContent);

    const comparison = compareObjects(arObj, enObj);

    if (comparison.missingInEn.length) {
        console.log("Keys missing in en.json:");
        comparison.missingInEn.forEach(k => console.log(`- ${k}`));
    }

    if (comparison.missingInAr.length) {
        console.log("Keys missing in ar.json:");
        comparison.missingInAr.forEach(k => console.log(`- ${k}`));
    }

    if (!comparison.missingInEn.length && !comparison.missingInAr.length) {
        console.log("Structures match perfectly!");
    }

} catch (err) {
    console.error("Error:", err.message);
}
