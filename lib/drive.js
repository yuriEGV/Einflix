import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Constants
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const KEY_PATH = path.join(process.cwd(), 'service-account.json');

// Singleton for Drive Client
let driveClient = null;

export async function getDriveClient() {
    if (driveClient) return driveClient;

    try {
        if (!fs.existsSync(KEY_PATH)) {
            console.error("Service Account Key not found at:", KEY_PATH);
            return null;
        }

        const auth = new google.auth.GoogleAuth({
            keyFile: KEY_PATH,
            scopes: SCOPES,
        });

        driveClient = google.drive({ version: 'v3', auth });
        return driveClient;
    } catch (error) {
        console.error("Google Auth Error:", error);
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
