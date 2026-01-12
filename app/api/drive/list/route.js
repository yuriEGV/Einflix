import { getDriveClient, getAllDriveClients, encryptId, decryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

// Simple in-memory cache for folder listings
const folderCache = new Map();
const CACHE_TTL = 120000; // 2 minutes

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const encryptedFolderId = searchParams.get('id');
    const folderId = decryptId(encryptedFolderId);

    console.log(`[Drive List] Req: ${encryptedFolderId?.slice(0, 10)}... -> Decrypted: ${folderId}`);

    if (!folderId) {
        console.error("❌ Drive List Error: Missing or invalid folder ID");
        return new Response(JSON.stringify({ error: 'Missing folder ID' }), { status: 400 });
    }

    // Check Cache
    const cached = folderCache.get(folderId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[Drive List] Serving cached data for: ${folderId}`);
        return new Response(JSON.stringify(cached.data), {
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
        });
    }

    try {
        const clients = await getAllDriveClients();

        if (clients.length === 0) {
            console.error("❌ Drive client not initialized - check GOOGLE_APPLICATION_CREDENTIALS");
            return new Response(JSON.stringify({
                error: 'service_unavailable',
                message: 'Drive service is not available. Please try again later.'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let lastError = null;
        let files = null;

        // Try sequentially across all available accounts
        for (const client of clients) {
            try {
                console.log(`[Drive List] Attempting fetch with ${client.source} for folder ${folderId}`);

                // 1. Accessibility check
                await client.instance.files.get({
                    fileId: folderId,
                    fields: 'id, name',
                    supportsAllDrives: true
                });

                // 2. Listing
                const response = await client.instance.files.list({
                    q: `'${folderId}' in parents and trashed = false`,
                    fields: 'files(id, name, mimeType, thumbnailLink)',
                    orderBy: 'name',
                    pageSize: 100,
                    supportsAllDrives: true,
                    includeItemsFromAllDrives: true
                });

                files = response.data.files.map(file => {
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
                        mimeType: file.mimeType,
                        thumbnail: `/api/poster/${safeId}`,
                        original: isFolder ? null : `/api/stream/${safeId}`,
                        preview: isFolder
                            ? `/api/drive/list?id=${safeId}`
                            : `/api/stream/${safeId}`
                    };
                });

                // Success!
                break;
            } catch (e) {
                lastError = e;
                console.warn(`⚠️ [Drive List] ${client.source} failed: ${e.message}`);
                // Continue to next client if 404/403 (permissions or not found for THIS account)
                if (e.code !== 404 && e.code !== 403) {
                    // If it's something else but not quota, we might want to log it specifically
                }
            }
        }

        if (!files) {
            console.error(`❌ [Drive List] Exhausted all accounts for folder: ${folderId}`);
            return new Response(JSON.stringify({
                error: 'not_found',
                message: 'No se pudo acceder a la carpeta. Verifique que esté compartida con las cuentas del sistema.',
                debug: lastError?.message
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Save to cache
        folderCache.set(folderId, { data: files, timestamp: Date.now() });

        return new Response(JSON.stringify(files), {
            headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
        });

    } catch (error) {
        console.error('Drive List Critical Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
