const fs = require('fs');
const path = require('path');

const arPath = path.join(__dirname, 'src/messages/ar.json');
let content = fs.readFileSync(arPath, 'utf8');

// Replace " (مترجم)" or "(مترجم)"
content = content.replace(/ \u0028\u0645\u062A\u0631\u062C\u0645\u0029/g, "");
content = content.replace(/\u0028\u0645\u062A\u0631\u062C\u0645\u0029/g, "");

fs.writeFileSync(arPath, content, 'utf8');
console.log("Removed (مترجم) from ar.json");
