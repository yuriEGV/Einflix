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

    if (!encryptedId) {
        return new Response('Missing ID', { status: 400 });
    }

    const key = decryptId(encryptedId);
    const diagHeaders = {
        'X-Einflix-Enc-ID': encryptedId.slice(0, 10),
        'X-Einflix-Dec-ID': key ? (key.slice(0, 3) + '...' + key.slice(-3)) : 'FAIL'
    };

    if (!key) {
        return new Response('Invalid ID or Decryption Failed', {
            status: 400,
            headers: { ...diagHeaders }
        });
    }

    try {
        const isDriveId = key.match(/^[-\w]{25,}$/);
        diagHeaders['X-Einflix-Type'] = isDriveId ? 'Drive' : 'S3';

        if (!isDriveId) {
            // CASE: S3 Content
            const url = await getS3PresignedUrl(key, 3600);

            if (!url) {
                return new Response(JSON.stringify({
                    error: 'not_found',
                    message: 'No se pudo encontrar el archivo en S3.'
                }), { status: 404, headers: { ...diagHeaders, 'Content-Type': 'application/json' } });
            }

            if (isHead) return new Response(null, { status: 200, headers: diagHeaders });

            return new Response(null, {
                status: 307,
                headers: {
                    ...diagHeaders,
                    'Location': url,
                    'Cache-Control': 'no-store',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // CASE: Legacy Google Drive Content
        const clients = await getAllDriveClients();
        diagHeaders['X-Einflix-Accounts'] = clients.length.toString();

        if (clients.length === 0) {
            return new Response('Drive service unavailable (No service accounts)', {
                status: 503,
                headers: diagHeaders
            });
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
                diagHeaders['X-Einflix-Success-Slot'] = client.source;
                break;
            } catch (e) {
                lastError = e;
            }
        }

        if (!fileMeta) {
            const isQuotaTotal = (lastError?.status === 403 || lastError?.message?.includes('403') || lastError?.message?.includes('rate limit'));
            return new Response(`Drive error: ${lastError?.message || 'Not found'}`, {
                status: isQuotaTotal ? 403 : 404,
                headers: { ...diagHeaders, 'X-Einflix-Last-Error': lastError?.message?.slice(0, 50) }
            });
        }

        if (isHead) return new Response(null, { status: 200, headers: { ...diagHeaders, 'Content-Length': fileMeta.size } });

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
            ...diagHeaders,
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
        return new Response('Error streaming file', { status: 500, headers: diagHeaders });
    }
}
