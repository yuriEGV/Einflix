import { getDriveClient, encryptId, decryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const encryptedFolderId = searchParams.get('id');
    const folderId = decryptId(encryptedFolderId);

    console.log(`[Drive List] Req: ${encryptedFolderId?.slice(0, 10)}... -> Decrypted: ${folderId}`);

    if (!folderId) {
        console.error("❌ Drive List Error: Missing or invalid folder ID");
        return new Response(JSON.stringify({ error: 'Missing folder ID' }), { status: 400 });
    }

    try {
        const drive = await getDriveClient();

        if (!drive) {
            console.error("❌ Drive client not initialized - check GOOGLE_APPLICATION_CREDENTIALS");
            return new Response(JSON.stringify({
                error: 'service_unavailable',
                message: 'Drive service is not available. Please try again later.'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // HEURISTIC: First check if the folder itself exists and is accessible
        try {
            await drive.files.get({
                fileId: folderId,
                fields: 'id, name',
                supportsAllDrives: true
            });
        } catch (e) {
            console.error(`❌ [Drive List] Folder NOT ACCESSIBLE: ${folderId}`, e.message);
            return new Response(JSON.stringify({
                error: 'not_found',
                message: 'No tienes permisos para esta carpeta. Debes compartirla con el correo del sistema.'
            }), {
                status: 404, // Use 404 to hide existence if preferred, but message clarifies
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, thumbnailLink)',
            orderBy: 'name',
            pageSize: 100,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        const files = response.data.files.map(file => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const isPdf = file.mimeType === 'application/pdf';
            const isAudio = file.mimeType.startsWith('audio/');
            const isComic = file.name.toLowerCase().endsWith('.cbr') || file.name.toLowerCase().endsWith('.cbz');
            const isVideo = file.mimeType.startsWith('video/') || file.name.toLowerCase().endsWith('.avi');

            let type = 'video';
            if (isFolder) type = 'folder';
            else if (isPdf) type = 'pdf';
            else if (isAudio) type = 'audio';
            else if (isComic) type = 'pdf';
            else if (isVideo) type = 'video';

            const safeId = encryptId(file.id);

            return {
                id: safeId,
                title: file.name,
                type: type,
                mimeType: file.mimeType, // Pass raw mimeType for frontend checks (e.g. CBR)
                // Use our internal proxy for everything
                thumbnail: `/api/poster/${safeId}`,
                original: isFolder ? null : `/api/stream/${safeId}`,
                preview: isFolder
                    ? `/api/drive/list?id=${safeId}`
                    : `/api/stream/${safeId}`
            };
        });

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
