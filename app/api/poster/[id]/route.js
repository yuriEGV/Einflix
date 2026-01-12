import { getDriveClient, decryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE_URL = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80';

export async function GET(req, { params }) {
    const { id: encryptedId } = params;

    if (!encryptedId) {
        return new Response('Missing ID', { status: 400 });
    }

    const id = decryptId(encryptedId);

    try {
        const drive = await getDriveClient();
        if (!drive) {
            console.error("❌ Drive client not initialized - check GOOGLE_APPLICATION_CREDENTIALS");
            return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
        }

        // Fetch image as stream
        const response = await drive.files.get(
            { fileId: id, alt: 'media', acknowledgeAbuse: true },
            { responseType: 'stream' }
        );

        const headers = new Headers();
        headers.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=604800, immutable'); // Cache 7 days
        headers.set('Access-Control-Allow-Origin', '*');

        const nodeStream = response.data;
        let isCancelled = false;

        const webStream = new ReadableStream({
            start(controller) {
                nodeStream.on('data', (chunk) => {
                    if (!isCancelled) {
                        try {
                            controller.enqueue(chunk);
                        } catch (e) {
                            isCancelled = true;
                            nodeStream.destroy();
                        }
                    }
                });
                nodeStream.on('end', () => {
                    if (!isCancelled) {
                        try {
                            controller.close();
                        } catch (e) { }
                    }
                });
                nodeStream.on('error', (err) => {
                    if (!isCancelled) {
                        try {
                            controller.error(err);
                        } catch (e) { }
                    }
                });
            },
            cancel() {
                isCancelled = true;
                nodeStream.destroy();
            }
        });

        return new Response(webStream, { headers });

    } catch (error) {
        // Suppress logs for expected errors (like folders which are not downloadable, or deleted/inaccessible files)
        const errorMsg = JSON.stringify(error);
        const isNotDownloadable = errorMsg.includes('fileNotDownloadable') || error.message?.includes('fileNotDownloadable');
        const isNotFound = error.code === 404 || errorMsg.includes('File not found') || error.message?.includes('File not found');

        if (!isNotDownloadable && !isNotFound) {
            console.error('Poster Proxy Error:', error.message || error);
        }

        // If quota exceeded, not downloadable (folder), or not found, redirect to fallback
        return new Response(null, { status: 302, headers: { Location: FALLBACK_IMAGE_URL } });
    }
}
