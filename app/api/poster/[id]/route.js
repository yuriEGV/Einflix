import { getS3PresignedUrl } from '@/lib/s3';
import { decryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80';

export async function GET(req, { params }) {
    const { id: encryptedId } = params;

    if (!encryptedId) {
        return new Response('Missing ID', { status: 400 });
    }

    const key = decryptId(encryptedId);

    try {
        // Detect if it is a Google Drive ID (usually 33 chars alphanumeric/dashes)
        const isDriveId = key.match(/^[-\w]{25,}$/);

        let imageUrl = '';
        if (isDriveId) {
            // Option 1: Direct link (requires public file)
            imageUrl = `https://drive.google.com/uc?export=view&id=${key}`;
        } else {
            // Option 2: S3 Presigned URL
            imageUrl = await getS3PresignedUrl(key, 3600);
        }

        if (!imageUrl) {
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        // PROXY: Fetch and return directly to avoid CORS/429 in browser and hide S3 URL
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
