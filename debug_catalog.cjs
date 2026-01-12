const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'CLASICOS.txt');

console.log(`Reading file from: ${filePath}`);

if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`Raw Content: "${content}"`);

    const lines = content.split('\n').filter(line => line.trim());
    console.log(`Found ${lines.length} lines.`);

    lines.forEach((line, index) => {
        console.log(`Line ${index + 1}: ${line}`);
        const parts = line.split('|').map(p => p.trim());
        const url = parts[0] || '';

        const idMatch = url.match(/[-\w]{25,}/);
        const id = idMatch ? idMatch[0] : null;

        console.log(`  Extracted URL: ${url}`);
        console.log(`  Extracted ID: ${id}`);
        console.log(`  Title: ${parts[1]}`);
        console.log(`  Category: ${parts[2]}`);
    });
} else {
    console.log('File does not exist!');
}
