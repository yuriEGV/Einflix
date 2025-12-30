import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);

export async function GET(req, { params }) {
    // 1. Authentication & Session Check
    const token = req.cookies.get('session_token')?.value;
    if (!token) return new NextResponse('Unauthorized', { status: 401 });

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'einflix_super_secret_key_2024');
        const { payload } = await jwtVerify(token, secret);

        // Optional: Check activeSessionId against DB here for strict enforcement
        // For MVP, we trust the token payload + heartbeat will kill it if invalid
        if (!payload.sessionId) return new NextResponse('Invalid Session', { status: 401 });

    } catch (e) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = params;
    if (!id) return new NextResponse('Missing ID', { status: 400 });

    // 2. Lookup Content
    const dataDir = path.join(process.cwd(), 'data');
    const catalogFiles = ['peliculas.txt', 'series.txt', 'comics.txt', 'musica.txt', 'karaoke.txt', 'libros.txt', 'otros.txt'];

    let targetItem = null;

    for (const filename of catalogFiles) {
        const filePath = path.join(dataDir, filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            for (const line of lines) {
                const parts = line.split('|').map(p => p.trim());
                const urlOrId = parts[0];

                if (urlOrId === id || urlOrId.includes(id)) {
                    let type = parts[7];
                    let storageKey = parts[6];

                    if (!type && !urlOrId.startsWith('local-')) {
                        type = 'drive';
                        // StorageKey for Drive is the ID itself
                        storageKey = id;
                    }

                    targetItem = {
                        storageKey: storageKey,
                        type: type || 'mp4',
                        isLocal: urlOrId.startsWith('local-')
                    };
                    break;
                }
            }
        }
        if (targetItem) break;
    }

    if (!targetItem) {
        if (id.match(/^[-\w]{25,}$/)) {
            targetItem = {
                type: 'drive',
                isLocal: false,
                storageKey: id
            };
        }
    }

    if (!targetItem) {
        return new NextResponse('Content not found', { status: 404 });
    }

    // 3. Serve Video Stream or Redirect
    try {
        if (!targetItem.isLocal) {
            // DIRECT REDIRECT FOR DRIVE (Optimization for Vercel Limits)
            // Instead of proxying, we redirect users directly to Google Drive.
            const driveId = targetItem.storageKey || id;
            const apiKey = process.env.GOOGLE_API_KEY;

            if (!apiKey) {
                console.error("Missing GOOGLE_API_KEY");
                return new NextResponse('Server Configuration Error', { status: 500 });
            }

            const driveUrl = `https://www.googleapis.com/drive/v3/files/${driveId}?alt=media&key=${apiKey}`;

            // 307 Temporary Redirect
            return NextResponse.redirect(driveUrl);

        } else {
            // LOCAL FILE STREAMING
            if (!targetItem.storageKey) return new NextResponse('File not found', { status: 404 });

            const videoPath = targetItem.storageKey;
            const stats = await stat(videoPath);
            const fileSize = stats.size;
            const range = req.headers.get('range');

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(videoPath, { start, end });

                const stream = new ReadableStream({
                    start(controller) {
                        file.on('data', (chunk) => controller.enqueue(chunk));
                        file.on('end', () => controller.close());
                        file.on('error', (err) => controller.error(err));
                    }
                });

                const headers = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                };

                return new NextResponse(stream, { status: 206, headers });
            } else {
                const headers = {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                };

                const file = fs.createReadStream(videoPath);
                const stream = new ReadableStream({
                    start(controller) {
                        file.on('data', (chunk) => controller.enqueue(chunk));
                        file.on('end', () => controller.close());
                        file.on('error', (err) => controller.error(err));
                    }
                });

                return new NextResponse(stream, { status: 200, headers });
            }
        }
    } catch (error) {
        console.error("Streaming error:", error);
        return new NextResponse('Error streaming file', { status: 500 });
    }
}
