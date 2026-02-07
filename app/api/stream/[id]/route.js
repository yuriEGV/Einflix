import { jwtVerify } from 'jose';
import { getAllDriveClients, decryptId } from '@/lib/drive';
import { getS3PresignedUrl } from '@/lib/s3';
import { isRateLimited } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    return handleRequest(req, params);
}

export async function HEAD(req, { params }) {
    return handleRequest(req, params, true);
}

async function handleRequest(req, params, isHead = false) {
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

    const key = decryptId(encryptedId);

    try {
        // Detect if it is S3 (usually has dots, slashes, or doesn't look like Drive ID)
        const isDriveId = key.match(/^[-\w]{25,}$/);

        if (!isDriveId) {
            // CASE: S3 Content
            const url = await getS3PresignedUrl(key, 3600);

            if (!url) {
                return new Response(JSON.stringify({
                    error: 'not_found',
                    message: 'No se pudo encontrar el archivo en S3.'
                }), { status: 404, headers: { 'Content-Type': 'application/json' } });
            }

            if (isHead) {
                return new Response(null, { status: 200 });
            }

            return new Response(null, {
                status: 307,
                headers: {
                    'Location': url,
                    'Cache-Control': 'no-store',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // CASE: Legacy Google Drive Content
        const clients = await getAllDriveClients();
        if (clients.length === 0) {
            // If no rotation keys, try to use the single one from lib/drive initialization
            // but usually we want to return 503 if no service accounts are configured for rotation on Vercel
            return new Response('Drive service unavailable (No service accounts)', { status: 503 });
        }

        let fileMeta = null;
        let successfulClient = null;
        let lastError = null;

        for (const client of clients) {
            try {
                const metaRes = await client.instance.files.get({ fileId: key, fields: 'size, mimeType, name' });
                fileMeta = metaRes.data;
                successfulClient = client;
                break;
            } catch (e) {
                lastError = e;
                console.warn(`⚠️ [Stream Meta] ${client.source} failed: ${e.message}`);
                // If it's 404, no point in trying other clients usually, but Drive sometimes is weird
            }
        }

        if (!fileMeta) {
            const status = (lastError?.status === 403 || lastError?.message?.includes('403') || lastError?.message?.includes('rate limit')) ? 403 : 404;
            return new Response(`Drive error: ${lastError?.message || 'Not found'}`, { status });
        }

        if (isHead) return new Response(null, { status: 200, headers: { 'Content-Length': fileMeta.size } });

        // Fetch media with successful client
        const range = req.headers.get('range');
        const options = { fileId: key, alt: 'media', acknowledgeAbuse: true };
        const fetchOptions = { responseType: 'stream' };
        if (range) fetchOptions.headers = { Range: range };

        const mediaResponse = await successfulClient.instance.files.get(options, fetchOptions);

        const nodeStream = mediaResponse.data;
        const webStream = new ReadableStream({
            start(controller) {
                nodeStream.on('data', chunk => controller.enqueue(chunk));
                nodeStream.on('end', () => controller.close());
                nodeStream.on('error', err => controller.error(err));
            },
            cancel() { nodeStream.destroy(); }
        });

        const headers = {
            'Content-Type': fileMeta.mimeType || 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Content-Length': fileMeta.size,
            'X-Drive-Source': successfulClient.source
        };

        if (range && mediaResponse.headers['content-range']) {
            headers['Content-Range'] = mediaResponse.headers['content-range'];
            return new Response(webStream, { status: 206, headers });
        }

        return new Response(webStream, { status: 200, headers });

    } catch (error) {
        console.error("Streaming Error:", error);
        return new Response('Error streaming file', { status: 500 });
    }
}


