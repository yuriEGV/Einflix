import { jwtVerify } from 'jose';
import { getAllDriveClients, decryptId } from '@/lib/drive';
import { isRateLimited } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    // Basic Rate Limit
    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (isRateLimited(`stream-${ip}`, 100, 60000)) {
        return new Response('Too many requests', { status: 429 });
    }

    // 1. Authentication & Session Check
    const token = req.cookies.get('session_token')?.value;
    if (!token) return new Response('Unauthorized', { status: 401 });

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'einflix_super_secret_key_2024');
        const { payload } = await jwtVerify(token, secret);
        if (!payload.sessionId) return new Response('Invalid Session', { status: 401 });
    } catch (e) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { id: encryptedId } = params;
    if (!encryptedId) return new Response('Missing ID', { status: 400 });

    const id = decryptId(encryptedId);

    try {
        const clients = await getAllDriveClients();
        if (clients.length === 0) {
            console.error("❌ Drive client not initialized - check GOOGLE_APPLICATION_CREDENTIALS");
            return new Response(JSON.stringify({
                error: 'service_unavailable',
                message: 'Video streaming is temporarily unavailable.'
            }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }

        let fileMeta = null;
        let successfulClient = null;
        let lastError = null;

        // --- RETRY LOOP FOR METADATA ---
        for (const client of clients) {
            try {
                console.log(`[Stream] Attempting metadata with ${client.source} for ${id}`);
                const metaRes = await client.instance.files.get({ fileId: id, fields: 'size, mimeType, name' });
                fileMeta = metaRes.data;
                successfulClient = client;
                break;
            } catch (e) {
                lastError = e;
                console.warn(`⚠️ [Stream Meta] ${client.source} failed: ${e.message}`);
                // Continue to next account
            }
        }

        if (!fileMeta) {
            console.error(`❌ [Stream] Exhausted all accounts for metadata: ${id}`);
            return new Response(JSON.stringify({
                error: 'not_found',
                message: 'No se pudo acceder al archivo. Verifique permisos.',
                debug: lastError?.message
            }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const fileSize = parseInt(fileMeta.size);
        let mimeType = fileMeta.mimeType || 'application/octet-stream';
        const fileName = fileMeta.name || 'file';

        // MIME Guessing
        if (mimeType === 'application/octet-stream') {
            const ext = fileName.split('.').pop().toLowerCase();
            const mimeMap = {
                'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
                'mp4': 'video/mp4', 'mkv': 'video/x-matroska', 'webm': 'video/webm',
                'pdf': 'application/pdf', 'cbr': 'application/x-cbr', 'cbz': 'application/x-cbz'
            };
            if (mimeMap[ext]) mimeType = mimeMap[ext];
        }

        const contentDisposition = `inline; filename="${fileName.replace(/"/g, '')}"`;
        const range = req.headers.get('range');

        // --- FETCH MEDIA DATA (REUSING THE SUCCESSFUL CLIENT OR STARTING FRESH LOOP) ---
        // For efficiency, we try with successfulClient first, then loop others if media request fails (quota)
        const tryFetchMedia = async (client, rangeHeader) => {
            const options = { fileId: id, alt: 'media', acknowledgeAbuse: true };
            const fetchOptions = { responseType: 'stream' };
            if (rangeHeader) fetchOptions.headers = { Range: rangeHeader };
            return await client.instance.files.get(options, fetchOptions);
        };

        let mediaResponse = null;

        // Try successfulClient first
        try {
            mediaResponse = await tryFetchMedia(successfulClient, range ? range : null);
        } catch (e) {
            console.warn(`⚠️ [Stream Media] ${successfulClient.source} failed for media: ${e.message}. Retrying others...`);
            for (const client of clients) {
                if (client === successfulClient) continue;
                try {
                    mediaResponse = await tryFetchMedia(client, range ? range : null);
                    successfulClient = client;
                    break;
                } catch (e2) {
                    console.warn(`⚠️ [Stream Media] ${client.source} failed for media: ${e2.message}`);
                }
            }
        }

        if (!mediaResponse) {
            return new Response(JSON.stringify({
                error: 'quota_exceeded',
                message: 'Download quota exceeded or file inaccessible for all accounts.'
            }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        const nodeStream = mediaResponse.data;
        let isCancelled = false;

        const webStream = new ReadableStream({
            start(controller) {
                nodeStream.on('data', (chunk) => {
                    if (!isCancelled) {
                        try { controller.enqueue(chunk); }
                        catch (e) { isCancelled = true; nodeStream.destroy(); }
                    }
                });
                nodeStream.on('end', () => { if (!isCancelled) { try { controller.close(); } catch (e) { } } });
                nodeStream.on('error', (err) => { if (!isCancelled) { try { controller.error(err); } catch (e) { } } });
            },
            cancel() { isCancelled = true; nodeStream.destroy(); }
        });

        const headers = {
            'Content-Type': mimeType,
            'Content-Disposition': contentDisposition,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'X-Drive-Source': successfulClient.source
        };

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
            headers['Content-Length'] = chunksize.toString();
            return new Response(webStream, { status: 206, headers });
        } else {
            headers['Content-Length'] = fileSize.toString();
            return new Response(webStream, { status: 200, headers });
        }

    } catch (error) {
        console.error("Streaming Critical Error:", error);
        return new Response('Error streaming file', { status: 500 });
    }
}


