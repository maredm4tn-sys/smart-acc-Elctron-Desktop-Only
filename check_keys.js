const ar = require('./src/messages/ar.json');
const en = require('./src/messages/en.json');

function deepDiff(obj1, obj2, path = '') {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    const missingIn2 = keys1.filter(k => !keys2.includes(k));
    const missingIn1 = keys2.filter(k => !keys1.includes(k));

    if (missingIn2.length) {
        console.log(`❌ Path ${path || 'ROOT'} is missing keys in SECOND object: ${missingIn2.join(', ')}`);
    }
    if (missingIn1.length) {
        console.log(`❌ Path ${path || 'ROOT'} is missing keys in FIRST object: ${missingIn1.join(', ')}`);
    }

    keys1.forEach(k => {
        if (keys2.includes(k) && typeof obj1[k] === 'object' && obj1[k] !== null && !Array.isArray(obj1[k])) {
            deepDiff(obj1[k], obj2[k], path ? `${path}.${k}` : k);
        }
    });
}

console.log('--- Deep Auditing PartnersManagement ---');
deepDiff(ar.PartnersManagement || {}, en.PartnersManagement || {}, 'PartnersManagement');

console.log('\n--- Deep Auditing EmployeesManagement ---');
deepDiff(ar.EmployeesManagement || {}, en.EmployeesManagement || {}, 'EmployeesManagement');
