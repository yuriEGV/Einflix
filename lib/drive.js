import path from 'path';

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
