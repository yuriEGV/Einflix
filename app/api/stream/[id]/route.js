import { jwtVerify } from 'jose';
import { getDriveClient, decryptId } from '@/lib/drive';
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

    const id = decryptId(encryptedId);

    try {
        const drive = await getDriveClient();
        if (!drive) {
            console.error("❌ Drive client not initialized - check GOOGLE_APPLICATION_CREDENTIALS");
            return new Response(JSON.stringify({
                error: 'service_unavailable',
                message: 'Video streaming is temporarily unavailable.'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch metadata first to get full file size and mimeType
        let fileMeta;
        try {
            const metaRes = await drive.files.get({ fileId: id, fields: 'size, mimeType, name' });
            fileMeta = metaRes.data;
        } catch (metaError) {
            console.error("Error fetching file metadata:", metaError);
            throw metaError; // Let the catch block handle specific error codes
        }

        const fileSize = parseInt(fileMeta.size);
        let mimeType = fileMeta.mimeType || 'application/octet-stream';
        const fileName = fileMeta.name || 'file'; // Fallback name

        // Fix: Sniff MIME type from extension if Drive returns generic type
        if (mimeType === 'application/octet-stream') {
            const ext = fileName.split('.').pop().toLowerCase();
            const mimeMap = {
                'mp3': 'audio/mpeg',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'mp4': 'video/mp4',
                'mkv': 'video/x-matroska',
                'webm': 'video/webm',
                'pdf': 'application/pdf',
                'cbr': 'application/x-cbr',
                'cbz': 'application/x-cbz'
            };
            if (mimeMap[ext]) {
                mimeType = mimeMap[ext];
            }
        }

        // Ensure "inline" disposition to prevent auto-download, especially for PDFs
        // Use encodeURIComponent for safer filename handling in headers if needed, 
        // but simple quotes usually suffice for basic ASCII. 
        // For broad compatibility, we stick to simple replacement or just "filename".
        const contentDisposition = `inline; filename="${fileName.replace(/"/g, '')}"`;

        const range = req.headers.get('range');

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const response = await drive.files.get(
                { fileId: id, alt: 'media', acknowledgeAbuse: true },
                {
                    responseType: 'stream',
                    headers: { Range: `bytes=${start}-${end}` }
                }
            );

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

            const headers = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize.toString(),
                'Content-Type': mimeType,
                'Content-Disposition': contentDisposition,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
            };

            return new Response(webStream, { status: 206, headers });
        } else {
            // Full file request
            const response = await drive.files.get(
                { fileId: id, alt: 'media', acknowledgeAbuse: true },
                { responseType: 'stream' }
            );

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

            const headers = {
                'Content-Type': mimeType,
                'Content-Disposition': contentDisposition,
                'Content-Length': fileSize.toString(),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
            };

            return new Response(webStream, { status: 200, headers });
        }
    } catch (error) {
        console.error("Streaming proxy error details:", {
            message: error.message,
            code: error.code,
            responseStatus: error.response?.status,
            stack: error.stack
        });

        // Specific handling for Google Drive Quota
        if (error.code === 403 || (error.response && error.response.status === 403)) {
            const errorMsg = error.message || "";
            if (errorMsg.includes("quota") || errorMsg.includes("rateLimitExceeded")) {
                return new Response(JSON.stringify({
                    error: 'quota_exceeded',
                    message: 'Google Drive download quota exceeded for this file. Please try again later.'
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        return new Response('Error streaming file', { status: 500 });
    }
}


