const fs = require('fs');
const path = require('path');

const AR_PATH = path.join(__dirname, 'src', 'messages', 'ar.json');

function injectExtraCommonKeys() {
    const arData = JSON.parse(fs.readFileSync(AR_PATH, 'utf8'));

    if (!arData.Common) arData.Common = {};

    arData.Common.English = "English";
    arData.Common.Arabic = "العربية";

    fs.writeFileSync(AR_PATH, JSON.stringify(arData, null, 4), 'utf8');
    console.log("Successfully injected English/Arabic keys into ar.json!");
}

injectExtraCommonKeys();
