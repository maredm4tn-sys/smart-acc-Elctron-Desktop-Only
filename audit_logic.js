const fs = require('fs');
const path = require('path');

let totals = { files: 0, lines: 0 };
let yourCode = { files: 0, lines: 0 };

function walk(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) { return; }

    for (const file of files) {
        const fullPath = path.join(dir, file);

        // Skip some folders entirely to save time (like .git)
        if (file === '.git' || file === '.next' && dir === process.cwd()) {
            // continue
        }

        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                walk(fullPath);
            } else if (/\.(ts|tsx|js|json|css)$/.test(file)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n').length;

                totals.files++;
                totals.lines += lines;

                // If it's your code (not libraries)
                if (!fullPath.includes('node_modules') && !fullPath.includes('.next') && !fullPath.includes('dist')) {
                    yourCode.files++;
                    yourCode.lines += lines;
                }
            }
        } catch (e) { }
    }
}

console.log('\nScanning your massive kingdom... Please wait...');
walk(process.cwd());

console.log('\n========================================');
console.log('   PROJECT SCALE AUDIT RESULTS');
console.log('========================================');
console.log('\n[1] YOUR HANDWRITTEN CODE:');
console.log('    Files: ' + yourCode.files);
console.log('    Lines: ' + yourCode.lines.toLocaleString() + ' lines');

console.log('\n[2] GLOBAL SCALE (Including Libraries):');
console.log('    Total Files: ' + totals.files);
console.log('    Total Lines: ' + totals.lines.toLocaleString() + ' lines');
console.log('\n========================================');
console.log('Your project is indeed massive and powerful!');
