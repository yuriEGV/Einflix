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

const id = "ef-f095ddbb5b689095c59942a41c7dd8133dc05ade3e0fd4b1a207cc77c319f4320abeedbbafffa26fc47f20def6385c527b64ee73ec0657e14aa1ef8bee9d3bdc";
console.log("Original ID:", id);
console.log("Decrypted ID:", decryptId(id));
