import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = ('einflix_super_secret_id_key_2024').padEnd(32, '0').slice(0, 32);

function decryptId(text) {
    if (!text || !text.startsWith('ef-')) return text;
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

const id = "ef-023650a6a499713b4230494e8abfbc80fd1df56556684b386e6fc28d2818cc0987e5e46dc4b95ccc8a753d7434c70b68933f7378a92fb18543a5f9f088c24767";
console.log("Decrypted ID:", decryptId(id));
