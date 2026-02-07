import { decryptId, getAllDriveClients } from '@/lib/drive';
import { getS3PresignedUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80';

export async function GET(req, { params }) {
    return handleRequest(req, params);
}

export async function HEAD(req, { params }) {
    return handleRequest(req, params, true);
}

async function handleRequest(req, params, isHead = false) {
    const { id: encryptedId } = params;

    if (!encryptedId) {
        return new Response('Missing ID', { status: 400 });
    }

    const key = decryptId(encryptedId);

    try {
        const isDriveId = key.match(/^[-\w]{25,}$/);

        if (!isDriveId) {
            // S3 Logic
            const imageUrl = await getS3PresignedUrl(key, 3600);
            if (!imageUrl) return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
            if (isHead) return new Response(null, { status: 200 });

            const res = await fetch(imageUrl);
            if (!res.ok) return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });

            const blob = await res.blob();
            return new Response(blob, {
                status: 200,
                headers: {
                    'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Drive Logic with Rotation
        const clients = await getAllDriveClients();
        if (clients.length === 0) {
            console.error("[Poster] No Drive clients available");
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        let imageBlob = null;
        let contentType = 'image/jpeg';

        for (const client of clients) {
            try {
                // We use files.get with alt: 'media' to download the image
                const res = await client.instance.files.get(
                    { fileId: key, alt: 'media', acknowledgeAbuse: true },
                    { responseType: 'arraybuffer' }
                );

                imageBlob = res.data;
                contentType = res.headers['content-type'] || 'image/jpeg';
                break;
            } catch (e) {
                console.warn(`[Poster] Client ${client.source} failed for ${key}: ${e.message}`);
                // Continue to next client
            }
        }

        if (!imageBlob) {
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        if (isHead) return new Response(null, { status: 200 });

        return new Response(imageBlob, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache posters longer
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error("[Poster Proxy] Error:", error);
        return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
    }
}
