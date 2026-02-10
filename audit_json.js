const fs = require('fs');
const path = require('path');

const files = ['src/messages/ar.json', 'src/messages/en.json'];

files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${file} is valid JSON.`);
    } catch (e) {
        console.error(`❌ ${file} has errors:`, e.message);

        // Try to find the line number
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let errorLine = -1;

        // Heuristic to find the approximate line of the error
        const match = e.message.match(/at position (\d+)/);
        if (match) {
            const pos = parseInt(match[1]);
            let currentPos = 0;
            for (let i = 0; i < lines.length; i++) {
                currentPos += lines[i].length + 1; // +1 for newline
                if (currentPos >= pos) {
                    errorLine = i + 1;
                    break;
                }
            }
        }

        if (errorLine !== -1) {
            console.error(`Possible error around line: ${errorLine}`);
            console.error('Context:', lines.slice(Math.max(0, errorLine - 3), errorLine + 2).join('\n'));
        }
    }
});
