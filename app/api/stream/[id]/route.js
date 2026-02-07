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
    if (!key || key === encryptedId && encryptedId.startsWith('ef-')) {
        console.error(`[Stream] Decryption failed or returned invalid key for: ${encryptedId}`);
        return new Response('Invalid or unreadable ID', { status: 400 });
    }

    try {
        const isDriveId = key.match(/^[-\w]{25,}$/);

        if (!isDriveId) {
            // CASE: S3 Content
            const url = await getS3PresignedUrl(key, 3600);

            if (!url) {
                console.error(`[S3 Stream] File not found in S3: ${key}`);
                return new Response(JSON.stringify({
                    error: 'not_found',
                    message: 'No se pudo encontrar el archivo en S3.'
                }), { status: 404, headers: { 'Content-Type': 'application/json' } });
            }

            if (isHead) return new Response(null, { status: 200 });

            console.log(`[S3 Stream] Redirecting to S3 for: ${key}`);
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
        console.log(`[Drive Stream] Starting rotation for ${key}. Available clients: ${clients.length}`);

        if (clients.length === 0) {
            console.error("[Drive Stream] CRITICAL: No Drive clients configured in environment.");
            return new Response('Drive service unavailable (No service accounts)', { status: 503 });
        }

        let fileMeta = null;
        let successfulClient = null;
        let lastError = null;
        let attempts = 0;

        for (const client of clients) {
            attempts++;
            try {
                const metaRes = await client.instance.files.get({ fileId: key, fields: 'size, mimeType, name' });
                fileMeta = metaRes.data;
                successfulClient = client;
                console.log(`[Drive Stream] ✅ Success with ${client.source} on attempt ${attempts}`);
                break;
            } catch (e) {
                lastError = e;
                const isQuota = e.status === 403 || e.message?.includes('403') || e.message?.includes('rate limit');
                console.warn(`[Drive Stream] ❌ Client ${client.source} failed (Attempt ${attempts}): ${isQuota ? 'QUOTA_EXCEEDED' : e.message}`);

                // If it's a 404 (Not Found), it might be that THIS service account doesn't have permission.
                // We keep trying other accounts.
            }
        }

        if (!fileMeta) {
            const isQuotaTotal = (lastError?.status === 403 || lastError?.message?.includes('403') || lastError?.message?.includes('rate limit'));
            console.error(`[Drive Stream] 💀 All ${clients.length} clients failed for ${key}. Last error: ${lastError?.message}`);
            return new Response(`Drive error: ${lastError?.message || 'Not found'}`, {
                status: isQuotaTotal ? 403 : 404
            });
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


