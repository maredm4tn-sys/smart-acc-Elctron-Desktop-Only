const fs = require('fs');
const path = require('path');

const filesToClean = [
    'src/features/sales/components/invoice-form.tsx',
    'src/features/representatives/components/representatives-client.tsx',
    'src/features/representatives/components/representative-actions.tsx'
];

filesToClean.forEach(relPath => {
    const fullPath = path.join(__dirname, relPath);
    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. Remove standard dict fallbacks: dict.Foo?.Bar || "Some string"
    content = content.replace(/(\bdict(?:\.?\w+\??)+)\s*\|\|\s*(["'])[^"']*\2/g, "$1");

    // 2. Fix specific logic in invoice-form.tsx
    if (relPath.includes("invoice-form.tsx")) {
        content = content.replace(
            `const isDefault = !currentName || currentName === "Cash Customer" || currentName === "عميل نقدي";`,
            `const isDefault = !currentName || currentName === dict.POS?.CashCustomer;`
        );
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log("Cleaned fallbacks in: " + relPath);
});
