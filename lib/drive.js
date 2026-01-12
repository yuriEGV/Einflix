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
 */
export function encryptId(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Format: iv:encrypted (hex)
    return 'ef-' + iv.toString('hex') + encrypted.toString('hex');
}

/**
 * Decrypts an obfuscated ID back to the real Google Drive ID.
 */
export function decryptId(text) {
    if (!text) return null;
    if (!text.startsWith('ef-')) {
        console.log(`[Drive Lib] ID not encrypted, passing through: ${text?.slice(0, 10)}...`);
        return text;
    }
    try {
        const raw = text.replace('ef-', '');
        const iv = Buffer.from(raw.slice(0, 32), 'hex');
        const encryptedText = Buffer.from(raw.slice(32), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        const result = decrypted.toString();
        console.log(`[Drive Lib] Decryption success: ${text?.slice(0, 10)}... -> ${result?.slice(0, 10)}...`);
        return result;
    } catch (error) {
        console.error("❌ [Drive Lib] Decryption failed for:", text, error.message);
        return text;
    }
}

// Constants
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// Singleton for Drive Client
let driveClient = null;

export async function getDriveClient() {
    if (driveClient) return driveClient;

    try {
        let auth;

        // DEBUG: Print env vars
        const gCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
        const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

        console.log(`[Drive Lib] Checking credentials... GOOGLE_SERVICE_ACCOUNT_KEY: ${saKey ? 'PRESENT' : 'MISSING'}, GOOGLE_SERVICE_ACCOUNT_JSON: ${saJson ? 'PRESENT' : 'MISSING'}`);
        if (gCredentials) {
            console.log(`[Drive Lib] GOOGLE_APPLICATION_CREDENTIALS is set to: ${gCredentials}`);
        }

        // CHECK LOCAL FILE FIRST: Robust fallback
        const localKeyPath = path.join(process.cwd(), 'service-account.json');

        // Option 1: Env var (Vercel/Cloud) - check both KEY and JSON names
        const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

        if (envKey) {
            try {
                // Try Base64 first
                const decoded = Buffer.from(envKey, 'base64').toString('utf8');
                const credentials = JSON.parse(decoded);
                auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
                console.log("✅ [Drive Lib] Using credentials from env var (Base64)");
            } catch (e) {
                try {
                    // Try raw JSON
                    const credentials = JSON.parse(envKey);
                    auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
                    console.log("✅ [Drive Lib] Using credentials from env var (Raw JSON)");
                } catch (e2) {
                    console.error("❌ [Drive Lib] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY/JSON");
                }
            }
        }
        else if (fs.existsSync(localKeyPath)) {
            console.log("✅ [Drive Lib] Found local key at:", localKeyPath);
            auth = new google.auth.GoogleAuth({ keyFile: localKeyPath, scopes: SCOPES });
        }
        else if (gCredentials && !gCredentials.startsWith('C:')) {
            console.log("✅ [Drive Lib] Using GOOGLE_APPLICATION_CREDENTIALS path:", gCredentials);
            auth = new google.auth.GoogleAuth({ scopes: SCOPES });
        }
        else if (gCredentials && gCredentials.startsWith('C:')) {
            console.error("❌ [Drive Lib] GOOGLE_APPLICATION_CREDENTIALS contains a Windows path (C:\\...). This will NOT work on Vercel. You must set GOOGLE_SERVICE_ACCOUNT_KEY with the JSON CONTENT.");
        }

        if (auth) {
            driveClient = google.drive({ version: 'v3', auth });
            console.log("✅ [Drive Lib] Initialization complete");
            return driveClient;
        }
        return null;

    } catch (error) {
        console.error("❌ Google Auth Error:", error.message);
        return null;
    }
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
