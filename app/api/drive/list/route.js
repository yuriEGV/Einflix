import { google } from 'googleapis';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('id');
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!folderId) {
        return new Response(JSON.stringify({ error: 'Missing folder ID' }), { status: 400 });
    }

    if (!apiKey) {
        // Fallback or error if no API Key is provided
        console.warn("GOOGLE_API_KEY is missing. Native explorer will not work.");
        return new Response(JSON.stringify({
            error: 'config_missing',
            message: 'GOOGLE_API_KEY is missing. Please add it to your .env file.'
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const drive = google.drive({ version: 'v3', auth: apiKey });

        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, thumbnailLink, webViewLink)',
            orderBy: 'name',
            pageSize: 100
        });

        const files = response.data.files.map(file => ({
            id: file.id,
            title: file.name,
            type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'video',
            thumbnail: file.thumbnailLink?.replace('=s220', '=s800') || `/api/drive/thumbnail?id=${file.id}`,
            original: file.webViewLink,
            preview: file.mimeType === 'application/vnd.google-apps.folder'
                ? `/api/drive/list?id=${file.id}`
                : `https://drive.google.com/file/d/${file.id}/preview`
        }));

        return new Response(JSON.stringify(files), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Drive List Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch from Drive: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
