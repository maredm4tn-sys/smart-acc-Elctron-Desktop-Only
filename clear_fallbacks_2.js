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
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;

        // Catch: dict.Vouchers?.System?.CashAccountDefault || (dict.Common?.Direction === 'rtl' ? "الصندوق" : "Cash")
        // and just strip the || (...) part.
        content = content.replace(/(\bdict(?:[\.\?]+\w+)+)\s*\|\|\s*\([^)]*\?.*?["'][^"']*["']\s*:\s*["'][^"']*["']\s*\)/g, "$1");

        // Catch: dict.Purchases.Table.Actions || "إجراءات"
        content = content.replace(/(\bdict(?:[\.\?]+\w+)+)\s*\|\|\s*(["'])[^"']*\2/g, "$1");

        // Catch: dict.Common?.Print || "طباعة الفاتورة"
        // Wait, the previous script should have caught this. Why didn't it?
        // Ah, maybe the regex `\bdict(?:[\.\?]+\w+)+` didn't catch `dict.Common?.Print`?
        // Yes it did! `dict`, then `.` then `Common`, then `?.` then `Print`. 
        // Oh, `[\.\?]+` matches `.` and `?.` perfectly. Wait, no! `?.` in regex is `\?\.` but `[\.\?]+` matches `.` or `?` one or more times, so it matches `?.`

        // Let's use an even simpler regex for fallbacks that doesn't care about the left side as much:
        // Match `|| "ArabicText"`
        content = content.replace(/\|\|\s*["'][\u0600-\u06FF\s]+["']/g, "");
        // Match `|| 'ArabicText'`
        content = content.replace(/\|\|\s*["'][^"']*[\u0600-\u06FF\s]+[^"']*["']/g, "");

        // Match `? "ArabicText" : "EnglishText"` inside `|| (...)`
        // Actually, let's just use replace with string matching for the hardcoded issues.

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Fixed fallbacks in: " + filePath);
            modifiedFiles++;
        }
    });
} catch (e) {
    console.error(e);
}
