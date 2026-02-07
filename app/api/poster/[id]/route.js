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

    // 1. Decrypt if necessary
    const key = decryptId(encryptedId);

    // Check if it's an encrypted Drive ID or a raw Drive ID
    const isDriveEncrypted = encryptedId.startsWith('ef-');
    const isDriveRaw = key && key.match(/^[-\w]{25,}$/);
    const isDriveId = isDriveEncrypted || isDriveRaw;

    const diagHeaders = {
        'X-Einflix-Enc-ID': encryptedId.slice(0, 15),
        'X-Einflix-Dec-Status': key ? 'OK' : 'FAIL',
        'X-Einflix-Type': isDriveId ? 'Drive' : 'S3'
    };

    if (isDriveEncrypted && !key) {
        return new Response('Decryption Failed - Encryption Key Mismatch?', {
            status: 403, // Use 403 to indicate something is blocked/wrong with credentials
            headers: { ...diagHeaders, 'X-Einflix-Error': 'DecryptionFailed' }
        });
    }

    try {
        if (!isDriveId) {
            // S3 Logic
            const imageUrl = await getS3PresignedUrl(key || encryptedId, 3600);
            if (!imageUrl) {
                return new Response(null, {
                    status: 302,
                    headers: { ...diagHeaders, Location: FALLBACK_IMAGE_URL, 'X-Einflix-Error': 'S3NotFound' }
                });
            }

            if (isHead) return new Response(null, { status: 200, headers: diagHeaders });

            const res = await fetch(imageUrl);
            if (!res.ok) return new Response(null, { status: 302, headers: { ...diagHeaders, Location: FALLBACK_IMAGE_URL } });

            const blob = await res.blob();
            return new Response(blob, {
                status: 200,
                headers: {
                    ...diagHeaders,
                    'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
                    'Cache-Control': 'public, max-age=3600',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Drive Logic with Rotation
        const clients = await getAllDriveClients();
        diagHeaders['X-Einflix-Accounts'] = clients.length.toString();

        if (clients.length === 0) {
            console.error("[Poster] No Drive clients available");
            return new Response(null, {
                status: 302,
                headers: { ...diagHeaders, Location: FALLBACK_IMAGE_URL, 'X-Error': 'NoAccounts' }
            });
        }

        let imageBlob = null;
        let contentType = 'image/jpeg';
        let lastErr = '';

        for (const client of clients) {
            try {
                // We use files.get with alt: 'media' to download the image
                const res = await client.instance.files.get(
                    { fileId: key, alt: 'media', acknowledgeAbuse: true },
                    { responseType: 'arraybuffer' }
                );

                imageBlob = res.data;
                contentType = res.headers['content-type'] || 'image/jpeg';
                diagHeaders['X-Einflix-Success-Slot'] = client.source;
                break;
            } catch (e) {
                console.warn(`[Poster] Client ${client.source} failed for ${key}: ${e.message}`);
                lastErr = e.message;
                // Continue to next client
            }
        }

        if (!imageBlob) {
            return new Response(null, {
                status: 302,
                headers: {
                    ...diagHeaders,
                    Location: FALLBACK_IMAGE_URL,
                    'X-Einflix-Last-Error': lastErr.slice(0, 50)
                }
            });
        }

        if (isHead) return new Response(null, { status: 200, headers: diagHeaders });

        return new Response(imageBlob, {
            status: 200,
            headers: {
                ...diagHeaders,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache posters longer
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error("[Poster Proxy] Error:", error);
        return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL, 'X-Error': 'Internal' } });
    }
}
