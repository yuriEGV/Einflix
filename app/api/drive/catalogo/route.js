import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { encryptId, decryptId } from '@/lib/drive';

export const dynamic = 'force-dynamic';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

export async function GET(req) {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get('session_token')?.value;
        let planType = 'none';

        if (token) {
            try {
                const secret = new TextEncoder().encode(SECRET_KEY);
                const { payload } = await jwtVerify(token, secret);
                const User = (await import('@/models/User')).default;
                const dbConnect = (await import('@/lib/mongodb')).default;
                await dbConnect();

                if (payload.id && typeof payload.id === 'string' && payload.id.match(/^[0-9a-fA-F]{24}$/)) {
                    const user = await User.findById(payload.id);
                    if (user && user.isPaid) {
                        planType = user.planType || 'basic';
                    }
                }
            } catch (e) {
                console.error("Token verification failed in catalog:", e);
            }
        }

        const dataDir = path.join(process.cwd(), 'data');
        let planFolder = 'basic'; // Default fallback

        // 2. Access Control
        const specialAccounts = ['yguajardov@gmail.com', 'vicente@einflix.com'];

        if (token) {
            try {
                const secret = new TextEncoder().encode(SECRET_KEY);
                const { payload } = await jwtVerify(token, secret);
                const User = (await import('@/models/User')).default;
                const dbConnect = (await import('@/lib/mongodb')).default;
                await dbConnect();

                if (payload.id) {
                    const user = await User.findById(payload.id);
                    if (user) {
                        if (specialAccounts.includes(user.email)) {
                            planFolder = 'total G';
                        } else if (user.isPaid) {
                            const type = (user.planType || 'basic').toLowerCase();
                            if (type.includes('total')) planFolder = 'total P';
                            else if (type.includes('medium')) planFolder = 'medium';
                            else planFolder = 'basic';
                        }
                    }
                }
            } catch (e) {
                console.error("Error identifying user for catalog:", e);
            }
        }

        const planDir = path.join(dataDir, planFolder);
        let allowedFiles = [];
        if (fs.existsSync(planDir)) {
            allowedFiles = fs.readdirSync(planDir).filter(f => f.endsWith('.txt') || f.endsWith('.json'));
        }

        const fileCategories = {
            'peliculas.txt': 'Película', 'series.txt': 'Serie', 'comics.txt': 'Comic',
            'musica.txt': 'Música', 'karaoke.txt': 'Karaoke', 'libros.txt': 'Libro',
            'otros.txt': 'Otros', 'CLASICOS.txt': 'Clásicos'
        };

        let rawItems = [];

        for (const filename of allowedFiles) {
            const defaultCategory = fileCategories[filename] || filename.replace('.txt', '');
            const filePath = path.join(planDir, filename);

            if (fs.existsSync(filePath)) {
                if (filename.endsWith('.txt') && !filename.includes('json')) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n').filter(line => line.trim());

                    const fileItems = lines.map(line => {
                        const parts = line.split('|').map(p => p.trim());
                        const url = parts[0] || '';

                        let id = null;
                        let isS3 = false;

                        if (url.startsWith('s3://')) {
                            id = url.replace('s3://', '');
                            isS3 = true;
                        } else if (url.startsWith('local-')) {
                            id = url;
                        } else {
                            const idMatch = url.match(/[-\w]{25,}/);
                            id = idMatch ? idMatch[0] : null;
                        }

                        if (!id) return null;

                        const category = parts[2] || defaultCategory;
                        const title = parts[1] || defaultCategory;

                        let contentType = 'video';
                        if (['Libro', 'Comic', 'Biblioteca'].includes(category)) contentType = 'pdf';
                        else if (['Música', 'Karaoke'].includes(category)) contentType = 'audio';

                        const isDriveFolder = url.includes('/folders/') || url.includes('embeddedfolderview');

                        return {
                            id,
                            title,
                            tags: [category],
                            cover: parts[3] || null,
                            description: parts[4] || 'Sin descripción disponible.',
                            folderUrl: url,
                            contentType: parts[7] || (isS3 ? 'folder' : (isDriveFolder ? 'drive' : contentType))
                        };
                    }).filter(Boolean);
                    rawItems = rawItems.concat(fileItems);
                } else if (filename.includes('json')) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const jsonData = JSON.parse(content);
                        const jsonItems = jsonData.map(item => {
                            const url = item.url || '';
                            const idMatch = url.match(/[-\w]{25,}/);
                            const id = idMatch ? idMatch[0] : null;
                            if (!id) return null;

                            return {
                                id,
                                title: item.titulo || item.categoria || `Contenido ${id.slice(0, 6)}`,
                                tags: [item.categoria || defaultCategory],
                                cover: item.thumbnail || null,
                                description: item.descripcion || 'Sin descripción disponible.',
                                folderUrl: url,
                                contentType: url.includes('/folders/') ? 'drive' : 'video'
                            };
                        }).filter(Boolean);
                        rawItems = rawItems.concat(jsonItems);
                    } catch (e) {
                        console.error(`Error parsing JSON ${filename}:`, e);
                    }
                }
            }
        }

        // Add Public Domain
        const jsonPath = path.join(dataDir, 'enflix_public_domain_films.json');
        if (fs.existsSync(jsonPath)) {
            try {
                const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                const jsonItems = jsonData.map((film, index) => {
                    const driveId = film.stream_url.match(/[-\w]{25,}/)?.[0];
                    const safeId = driveId ? encryptId(driveId) : `pd-${index}`;
                    return {
                        id: safeId,
                        title: film.titulo,
                        tags: [film.categoria || 'Película', 'Dominio Público'],
                        cover: film.thumbnail,
                        thumbnail: `/api/poster/${safeId}`,
                        description: film.descripcion || `Año: ${film.anio}. ${film.tipo}`,
                        folderUrl: `/api/stream/${safeId}`,
                        contentType: 'mp4',
                        isPublicDomain: true
                    };
                });
                rawItems = rawItems.concat(jsonItems);
            } catch (err) { }
        }

        // Mapping and Encryption
        let catalog = rawItems.map((item) => {
            const id = item.id;
            if (!id) return null;

            const isDriveId = !!((id.match(/^[-\w]{25,}$/) || id.startsWith('ef-')) && !id.startsWith('local-'));
            const isS3 = !isDriveId && !id.startsWith('local-');
            const safeId = id.startsWith('ef-') ? id : encryptId(id);

            let itemType = item.contentType || 'video';
            if (item.title && (item.title.toLowerCase().endsWith('.pdf') || item.category === 'Libro' || item.category === 'Comic')) {
                itemType = 'pdf';
            } else if (item.category === 'Música' || item.category === 'Karaoke') {
                itemType = 'audio';
            }

            const isFolder = itemType === 'drive' || itemType === 'folder' ||
                (item.folderUrl ? (item.folderUrl.includes('/folders/') || item.folderUrl.includes('embeddedfolderview')) : false);

            const type = isFolder ? 'folder' : itemType;

            const tags = item.tags || [];
            let category = tags[0] || (isFolder ? 'Carpeta' : 'Multimedia');
            category = category.charAt(0).toUpperCase() + category.slice(1);

            let previewUrl = `/api/stream/${safeId}`;
            let originalUrl = `/api/stream/${safeId}`;

            if (isFolder) {
                // If it's a Drive ID (raw or encrypted), we want BOTH routes to support it.
                // But specifically for folders, list/route handles them well.
                previewUrl = `/api/drive/list?id=${safeId}`;
                originalUrl = `/api/drive/list?id=${safeId}`;
            }

            return {
                id: safeId,
                title: item.title,
                category,
                description: item.description,
                type: type,
                thumbnail: `/api/poster/${safeId}`,
                original: originalUrl,
                preview: previewUrl,
                isS3: isS3
            };
        }).filter(item => item && (!item.title || !item.title.startsWith('Contenido ')));

        // Remove duplicates and sort
        const seen = new Set();
        catalog = catalog.filter(item => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        }).sort((a, b) => (a.title || '').localeCompare(b.title || ''));

        return new Response(JSON.stringify(catalog), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Catalog API Error:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}
