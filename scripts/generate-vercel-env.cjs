const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, '..', 'service-account.json');

try {
    if (!fs.existsSync(keyPath)) {
        console.error(`❌ Error: File not found at ${keyPath}`);
        process.exit(1);
    }

    const keyContent = fs.readFileSync(keyPath, 'utf8');
    const base64Key = Buffer.from(keyContent).toString('base64');

    console.log('\n✅ Success! generated base64 string for Vercel:\n');
    console.log('Add this Environment Variable in Vercel:');
    console.log('----------------------------------------');
    console.log('Key:   GOOGLE_SERVICE_ACCOUNT_JSON');
    console.log('Value: ' + base64Key);
    console.log('----------------------------------------\n');

} catch (error) {
    console.error('❌ Error processing file:', error);
}
