const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
            callback(dirPath);
        }
    }
}

let modifiedFiles = 0;

try {
    walkDir(srcDir, (filePath) => {
        let originalParams = fs.readFileSync(filePath, 'utf8');
        let content = originalParams;

        // 1. Standard UI Fallbacks: dict.Foo?.Bar || "Some string"
        content = content.replace(/(\bdict(?:[\.\?]+\w+)+)\s*\|\|\s*(["'])[^"']*\2/g, "$1");

        // 2. Ternary UI Fallbacks specifically targeting direction
        content = content.replace(/(\bdict(?:[\.\?]+\w+)+)\s*\|\|\s*\(\s*dict\.Common\?\.Direction\s*===\s*["']rtl["']\s*\?\s*(["'])[^"']*\2\s*:\s*(["'])[^"']*\3\s*\)/g, "$1");

        // 3. Simple ternary (dir === 'rtl' ? "ar" : "en")
        content = content.replace(/(\bdict(?:[\.\?]+\w+)+)\s*\|\|\s*\(\s*dir\s*===\s*["']rtl["']\s*\?\s*(["'])[^"']*\2\s*:\s*(["'])[^"']*\3\s*\)/g, "$1");

        // 4. Also fix some where it's not dict but settings?.taxEnabled 
        // Example: dict.Purchases.Table.Actions || "إجراءات"

        if (content !== originalParams) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Cleaned fallbacks in: " + filePath.split('src\\').pop());
            modifiedFiles++;
        }
    });

    // Vouchers actions specific string template fixes
    const vouchersActions = path.join(srcDir, 'features', 'vouchers', 'actions.ts');
    if (fs.existsSync(vouchersActions)) {
        let text = fs.readFileSync(vouchersActions, 'utf8');
        text = text.replace(/`\$\{dict\.(\S+)\s*\|\|\s*\([^)]+\)\}\s*-\s*\$\{([^}]+)\}`/g, "`${dict.$1} - ${$2}`");
        text = text.replace(/`\$\{dict\.(\S+)\s*\|\|\s*\([^)]+\)\}\s*\$\{([^}]+)\}`/g, "`${dict.$1} ${$2}`");
        text = text.replace(/`\$\{dict\.(\S+)\s*\|\|\s*\([^)]+\)\}\s*(:\s*)\$\{([^}]+)\}`/g, "`${dict.$1}$2${$3}`");
        text = text.replace(/dict\.(\S+)\s*\|\|\s*\([^)]+\)/g, "dict.$1");
        fs.writeFileSync(vouchersActions, text, 'utf8');
    }

    console.log(`Global sweep complete. Modified ${modifiedFiles} files.`);

} catch (e) {
    console.error("ERROR OCCURRED:", e);
}
