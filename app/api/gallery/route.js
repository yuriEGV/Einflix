import fs from 'fs/promises';
import path from 'path';
import { toDriveViewUrl, toDrivePreviewUrl, guessTypeFromUrl } from '../../../lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const filePath = path.join(process.cwd(), 'data', 'total G', 'drive_links.txt');
        const raw = await fs.readFile(filePath, 'utf8');
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        const items = lines.map(link => {
            const type = guessTypeFromUrl(link);
            const view = link.includes('drive.google.com') ? toDriveViewUrl(link) : link;
            const preview = link.includes('drive.google.com') ? toDrivePreviewUrl(link) : link;
            return {
                original: link,
                type,
                src: view,
                preview
            };
        });

        return new Response(JSON.stringify({ items }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        console.error('API /api/gallery error:', err);
        return new Response(JSON.stringify({ error: 'No se pudo leer drive_links.txt' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
