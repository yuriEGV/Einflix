import { getS3PresignedUrl } from '@/lib/s3';
import { decryptId } from '@/lib/drive';

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

        let imageUrl = '';
        if (isDriveId) {
            imageUrl = `https://drive.google.com/uc?export=view&id=${key}`;
        } else {
            imageUrl = await getS3PresignedUrl(key, 3600);
        }

        if (!imageUrl) {
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        if (isHead) {
            return new Response(null, { status: 200 });
        }

        const res = await fetch(imageUrl);
        if (!res.ok) {
            console.error(`[Poster Proxy] Failed to fetch: ${res.status} ${res.statusText} for ${key}`);
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        const blob = await res.blob();

        return new Response(blob, {
            status: 200,
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error("[Poster Proxy] Error:", error);
        return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
    }
}
