const fs = require('fs');
const pngToIco = require('png-to-ico');

pngToIco('public/icon.png')
    .then(buf => {
        fs.writeFileSync('public/icon.ico', buf);
        console.log('✅ icon.ico generated successfully!');
    })
    .catch(console.error);
