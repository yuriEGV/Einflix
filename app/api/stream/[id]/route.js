import { jwtVerify } from 'jose';
import { getAllDriveClients, decryptId } from '@/lib/drive';
import { getS3PresignedUrl } from '@/lib/s3';
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

    const key = decryptId(encryptedId);

    try {
        const isDriveId = key.match(/^[-\w]{25,}$/);

        if (!isDriveId) {
            // CASE: S3 Content
            console.log(`[S3 Stream] Generating URL for: ${key}`);
            const url = await getS3PresignedUrl(key, 3600);

            if (!url) {
                return new Response(JSON.stringify({
                    error: 'not_found',
                    message: 'No se pudo encontrar el archivo en S3.'
                }), { status: 404, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(null, {
                status: 307,
                headers: { 'Location': url, 'Cache-Control': 'no-store' }
            });
        }

        // CASE: Legacy Google Drive Content
        const clients = await getAllDriveClients();
        if (clients.length === 0) {
            return new Response('Drive service unavailable', { status: 503 });
        }

        let fileMeta = null;
        let successfulClient = null;

        for (const client of clients) {
            try {
                const metaRes = await client.instance.files.get({ fileId: key, fields: 'size, mimeType, name' });
                fileMeta = metaRes.data;
                successfulClient = client;
                break;
            } catch (e) {
                console.warn(`⚠️ [Stream Meta] ${client.source} failed: ${e.message}`);
            }
        }

        if (!fileMeta) {
            return new Response('File not found in any Drive account', { status: 404 });
        }

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


