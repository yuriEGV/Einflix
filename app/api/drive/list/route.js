import { getDriveClient } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('id');

    if (!folderId) {
        return new Response(JSON.stringify({ error: 'Missing folder ID' }), { status: 400 });
    }

    try {
        const drive = await getDriveClient();

        if (!drive) {
            console.warn("Drive Client Initialization Failed. Service Account might be missing.");
            return new Response(JSON.stringify({
                error: 'config_missing',
                message: 'Service Account configuration is missing.'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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
            // Use local proxy for thumbnails
            thumbnail: `/api/drive/thumbnail?id=${file.id}`,
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
