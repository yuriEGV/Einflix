import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = 'einflix_super_secret_id_key_2024'.padEnd(32, '0').slice(0, 32);

function decryptId(text) {
    if (!text) return null;
    if (!text.startsWith('ef-')) return text;
    try {
        const raw = text.replace('ef-', '');
        const iv = Buffer.from(raw.slice(0, 32), 'hex');
        const encryptedText = Buffer.from(raw.slice(32), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        return "ERROR: " + error.message;
    }
}

const id1 = "ef-65696e666c69785f73757065725f73650c547af0a5e4da83ef0706d8b5d7e4af7e4c57be1280fec6df5657ef32b37a86d02c22c0c50aeb3794df9b5817899147";
console.log("Decrypted (hardcoded key):", decryptId(id1));
