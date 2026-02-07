import { listBucketContents } from '@/lib/s3';
import { decryptId, encryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id') || '';

    // Decrypt if necessary
    const decodedId = decryptId(id);

    try {
        let files = [];

        // Detect if it is a Google Drive ID
        const isDriveId = decodedId && decodedId.match(/^[-\w]{25,}$/);

        if (isDriveId) {
            console.log(`[Hybrid List] Routing to Drive for: "${decodedId}"`);
            const { getDriveClient } = await import('@/lib/drive');
            const drive = await getDriveClient();
            if (!drive) throw new Error("Could not initialize Drive client");

            const driveRes = await drive.files.list({
                q: `'${decodedId}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType, thumbnailLink, size, webViewLink)',
                pageSize: 1000,
                orderBy: 'name',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });

            files = (driveRes.data.files || []).map(file => {
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                return {
                    id: file.id,
                    title: file.name,
                    type: isFolder ? 'folder' : (file.mimeType.startsWith('video/') ? 'video' : 'file'),
                    mimeType: file.mimeType,
                    size: file.size,
                    thumbnail: file.thumbnailLink,
                    original: file.webViewLink,
                    preview: `https://drive.google.com/file/d/${file.id}/preview`
                };
            });
        } else {
            // CASE: S3 Prefix
            console.log(`[Hybrid List] Routing to S3 for: "${decodedId}"`);
            files = await listBucketContents(decodedId);
        }

        // Encrypt all IDs in the response for consistency
        const encryptedFiles = files.map(file => {
            const safeId = encryptId(file.id);
            const isS3Content = !file.id.match(/^[-\w]{25,}$/);

            return {
                ...file,
                id: safeId,
                isS3: isS3Content,
                thumbnail: `/api/poster/${safeId}`,
                original: isS3Content ? `/api/stream/${safeId}` : file.original,
                preview: file.type === 'folder'
                    ? `/api/drive/list?id=${safeId}`
                    : (isS3Content ? `/api/stream/${safeId}` : file.preview)
            };
        });

        return new Response(JSON.stringify(encryptedFiles), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });

    } catch (error) {
        console.error('Hybrid List Error:', error);
        return new Response(JSON.stringify({
            error: 'server_error',
            message: 'Error al listar contenido.'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
