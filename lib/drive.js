import { google } from 'googleapis';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = (process.env.ID_ENCRYPTION_KEY || 'einflix_super_secret_id_key_2024').padEnd(32, '0').slice(0, 32);
const IV_LENGTH = 16;

/**
 * Encrypts a Google Drive ID to hide it from the client.
 * Uses a deterministic approach (fixed IV) to allow browser caching.
 */
export function encryptId(text) {
    if (!text) return null;
    // Use a fixed IV derived from the key to make encryption deterministic
    // This is safe enough for obfuscating Drive IDs and vital for caching.
    const iv = Buffer.from(ENCRYPTION_KEY.slice(0, 16));
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Format: ef- + iv (hex) + encrypted (hex)
    return 'ef-' + iv.toString('hex') + encrypted.toString('hex');
}

/**
 * Decrypts an obfuscated ID back to the real Google Drive ID.
 */
export function decryptId(text) {
    if (!text) return null;
    if (!text.startsWith('ef-')) {
        return text;
    }
    try {
        const raw = text.replace('ef-', '');
        const iv = Buffer.from(raw.slice(0, 32), 'hex');
        const encryptedText = Buffer.from(raw.slice(32), 'hex');

        const keyBuffer = Buffer.from(ENCRYPTION_KEY);
        if (keyBuffer.length !== 32) {
            console.error(`[Drive Lib] CRITICAL: Encryption key buffer length is ${keyBuffer.length}, expected 32.`);
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        const result = decrypted.toString();
        return result;
    } catch (error) {
        console.error(`❌ [Drive Lib] Decryption failed for ID: ${text?.slice(0, 15)}... Error: ${error.message}. Key prefix: ${ENCRYPTION_KEY.slice(0, 5)}...`);
        return null; // Return null on failure so we can distinguish from raw IDs
    }
}

// Self-Test on Load
(function selfTest() {
    try {
        const original = "test-id-1234567890";
        const encrypted = encryptId(original);
        const decrypted = decryptId(encrypted);
        if (original === decrypted) {
            console.log(`[Drive Lib] ✅ Encryption Self-Test Passed. Key Prefix: ${ENCRYPTION_KEY.slice(0, 5)}...`);
        } else {
            console.error(`[Drive Lib] ❌ Encryption Self-Test FAILED. Mismatch: ${original} vs ${decrypted}. Key Prefix: ${ENCRYPTION_KEY.slice(0, 5)}...`);
        }
    } catch (e) {
        console.error(`[Drive Lib] ❌ Encryption Self-Test CRASHED: ${e.message}`);
    }
})();

// Constants
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Singleton for Drive Client
let driveClient = null;

/**
 * Collects all available service account credentials.
 */
function getAllCredentials() {
    const keys = [];
    // 1. Scan for numbered keys (GOOGLE_SERVICE_ACCOUNT_KEY_1 to 10)
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GOOGLE_SERVICE_ACCOUNT_KEY_${i}`];
        if (key) {
            keys.push({ key, source: `SLOT_${i}` });
        }
    }

    // 2. Fallback to standard key if no numbered keys found
    if (keys.length === 0) {
        const standardKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        if (standardKey) {
            keys.push({ key: standardKey, source: 'STANDARD_SLOT' });
        }
    }
    return keys;
}

export async function getDriveClient() {
    try {
        const keys = getAllCredentials();
        const gCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        let auth;

        // 3. Selection Logic
        if (keys.length > 0) {
            // Pick a random key from the available ones
            const selected = keys[Math.floor(Math.random() * keys.length)];
            console.log(`[Drive Lib] 🔄 Rotating accounts... Using: ${selected.source} (Total: ${keys.length})`);

            try {
                // Handle Base64 (Vercel recommended) or raw JSON
                let credentials;
                try {
                    credentials = JSON.parse(Buffer.from(selected.key, 'base64').toString('utf8'));
                } catch (e) {
                    credentials = JSON.parse(selected.key);
                }
                auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
            } catch (err) {
                console.error(`❌ [Drive Lib] Failed to parse credentials from ${selected.source}`);
            }
        }
        else if (gCredentials && !gCredentials.startsWith('C:')) {
            console.log("✅ [Drive Lib] Using GOOGLE_APPLICATION_CREDENTIALS path");
            auth = new google.auth.GoogleAuth({ scopes: SCOPES });
        }
        else {
            // Local fallback for dev
            const localKeyPath = path.join(process.cwd(), 'service-account.json');
            if (fs.existsSync(localKeyPath)) {
                console.log("✅ [Drive Lib] Using local key file");
                auth = new google.auth.GoogleAuth({ keyFile: localKeyPath, scopes: SCOPES });
            }
        }

        if (auth) {
            return google.drive({ version: 'v3', auth });
        }

        console.error("❌ [Drive Lib] No valid Drive credentials found.");
        return null;

    } catch (error) {
        console.error("❌ [Drive Lib] Initialization error:", error.message);
        return null;
    }
}

// Cache for auth instances to avoid repeated parsing and instantiation
const authCache = new Map();

export async function getAllDriveClients() {
    const keys = getAllCredentials();
    const clients = [];

    for (const item of keys) {
        try {
            let auth;
            let clientEmail = null;

            if (authCache.has(item.source)) {
                auth = authCache.get(item.source);
                // Try to extract email for diagnostics
                clientEmail = auth.credentials?.client_email || 'cached';
            } else {
                let credentials;
                try {
                    // Try Base64 first
                    credentials = JSON.parse(Buffer.from(item.key, 'base64').toString('utf8'));
                } catch (e) {
                    // Try raw JSON
                    try {
                        credentials = JSON.parse(item.key);
                    } catch (errJson) {
                        console.error(`❌ [Drive Lib] Failed to parse JSON for ${item.source}`);
                    }
                }

                if (credentials) {
                    auth = new google.auth.GoogleAuth({
                        credentials,
                        scopes: SCOPES
                    });
                    clientEmail = credentials.client_email;
                    authCache.set(item.source, auth);
                } else {
                    console.error(`❌ [Drive Lib] No valid credentials for ${item.source}`);
                    continue; // Skip this client
                }
            }

            clients.push({
                instance: google.drive({ version: 'v3', auth }),
                source: item.source,
                email: clientEmail
            });
        } catch (error) {
            console.error(`❌ [Drive Lib] Failed to initialize client ${item.source}:`, error.message);
        }
    }

    if (clients.length === 0) {
        console.warn("[Drive Lib] ⚠️ No carousel clients available (Check GOOGLE_SERVICE_ACCOUNT_KEY_1-10)");
    }

    return clients;
}

export function extractDriveId(url) {
    if (!url) return null;
    // Matcher genérico para IDs de Drive
    const m = url.match(/[\w-]{25,}/);
    return m ? m[0] : null;
}

export function toDriveViewUrl(url) {
    const id = extractDriveId(url);
    if (!id) return url;
    // url para ver (usable en <img src> si el archivo es público y es imagen)
    return `https://drive.google.com/uc?export=view&id=${id}`;
}

export function toDrivePreviewUrl(url) {
    const id = extractDriveId(url);
    if (!id) return url;
    // url para iframe preview
    return `https://drive.google.com/file/d/${id}/preview`;
}

export function guessTypeFromUrl(url) {
    if (!url) return 'unknown';
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/)) return 'image';
    if (lower.match(/\.(mp4|webm|ogg|mov|mkv)(\?|$)/)) return 'video';
    // drive links
    if (url.includes('drive.google.com')) {
        // best-effort: treat as image/video unknown -> preview via iframe
        return 'drive';
    }
    return 'other';
}
