import { getAllDriveClients, decryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80';

export async function GET(req, { params }) {
    const { id: encryptedId } = params;

    if (!encryptedId) {
        return new Response('Missing ID', { status: 400 });
    }

    const id = decryptId(encryptedId);

    try {
        const clients = await getAllDriveClients();
        if (clients.length === 0) {
            console.error("❌ Drive client not initialized - check GOOGLE_APPLICATION_CREDENTIALS");
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        let mediaResponse = null;
        let successfulClient = null;

        // Try sequentially across all available accounts
        for (const client of clients) {
            try {
                // Fetch image as stream
                mediaResponse = await client.instance.files.get(
                    { fileId: id, alt: 'media', acknowledgeAbuse: true },
                    { responseType: 'stream' }
                );
                successfulClient = client;
                break;
            } catch (e) {
                // Log only if not found/not downloadable
                const isSilentError = e.code === 404 || e.message?.includes('fileNotDownloadable');
                if (!isSilentError) {
                    console.warn(`⚠️ [Poster] ${client.source} failed for ${id}: ${e.message}`);
                }
            }
        }

        if (!mediaResponse) {
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        const headers = new Headers();
        headers.set('Content-Type', mediaResponse.headers['content-type'] || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=604800, immutable'); // Cache 7 days
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('X-Drive-Source', successfulClient.source);

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

        return new Response(webStream, { headers });

    } catch (error) {
        return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
    }
}
