import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q')?.toLowerCase() || '';

        // --- AUTH & PLAN CHECK (Duplicated from Catalogo for security) ---
        const token = req.cookies.get('session_token')?.value;
        let planType = 'none';

        if (token) {
            try {
                const secret = new TextEncoder().encode(SECRET_KEY);
                const { payload } = await jwtVerify(token, secret);
                const User = (await import('@/models/User')).default;
                const dbConnect = (await import('@/lib/mongodb')).default;
                await dbConnect();

                const user = await User.findById(payload.id);
                if (user && user.isPaid) {
                    planType = user.planType || 'basic';
                }
            } catch (e) {
                console.error("Token verification failed in search:", e);
            }
        }

        const dataDir = path.join(process.cwd(), 'data');
        let allowedFiles = [];

        if (planType === 'total') {
            allowedFiles = ['peliculas.txt', 'series.txt', 'comics.txt', 'musica.txt', 'karaoke.txt', 'libros.txt', 'otros.txt'];
        } else if (planType === 'medium') {
            allowedFiles = ['peliculas.txt', 'series.txt'];
        } else if (planType === 'basic') {
            allowedFiles = ['libros.txt'];
        } else {
            allowedFiles = []; // No access
        }

        const fileCategories = {
            'peliculas.txt': 'Película',
            'series.txt': 'Serie',
            'comics.txt': 'Comic',
            'musica.txt': 'Música',
            'karaoke.txt': 'Karaoke',
            'libros.txt': 'Libro',
            'otros.txt': 'Otros'
        };

        const categoryImages = {
            'pelicula': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80',
            'serie': 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80',
            'anime': 'https://images.unsplash.com/photo-1578632738980-433120152918?w=800&q=80',
            'novedades': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
            'maratón': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80',
            'favoritos': 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80',
            'colección': 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&q=80',
            'streaming': 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80',
            'premium': 'https://images.unsplash.com/photo-1550745165-9bc0b25272a7?w=800&q=80',
            'biblioteca': 'https://images.unsplash.com/photo-1507014498014-97050e8902f2?w=800&q=80',
            'galería': 'https://images.unsplash.com/photo-1492037766660-2a56f9eb3fcb?w=800&q=80',
            'einflix': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80'
        };

        let results = [];

        for (const [filename, defaultCategory] of Object.entries(fileCategories)) {
            if (!allowedFiles.includes(filename)) continue;

            const filePath = path.join(dataDir, filename);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());

                lines.forEach(line => {
                    const parts = line.split('|').map(p => p.trim());
                    const url = parts[0] || '';

                    // Basic parsing
                    let id = null;
                    if (url.startsWith('local-')) {
                        id = url;
                    } else {
                        const idMatch = url.match(/[-\w]{25,}/);
                        id = idMatch ? idMatch[0] : null;
                    }

                    if (!id) return;

                    const title = parts[1] || '';
                    const tags = parts[2] ? [parts[2]] : [defaultCategory];
                    const description = parts[4] || '';

                    // SEARCH FILTER
                    const searchableText = `${title} ${tags.join(' ')} ${description}`.toLowerCase();
                    if (query && !searchableText.includes(query)) {
                        return; // Skip if doesn't match
                    }

                    // Map to Item object (same logic as Catalog)
                    const isFolder = url.includes('/folders/') || url.includes('embeddedfolderview');
                    let category = tags[0] || (isFolder ? 'Carpeta' : 'Multimedia');
                    category = category.charAt(0).toUpperCase() + category.slice(1);

                    let thumbnail = parts[3] || `/api/drive/thumbnail?id=${id}`;
                    // Thematic fallback
                    if (thumbnail.includes('drive.google.com') || thumbnail.includes('googleusercontent.com')) {
                        const lowTags = tags.map(t => t.toLowerCase());
                        let foundThematic = false;
                        for (const [key, tUrl] of Object.entries(categoryImages)) {
                            if (lowTags.includes(key) || category.toLowerCase().includes(key)) {
                                thumbnail = tUrl;
                                foundThematic = true;
                                break;
                            }
                        }
                        if (!foundThematic && id) thumbnail = `/api/drive/thumbnail?id=${id}`;
                    }

                    results.push({
                        id,
                        title,
                        category,
                        description: description || 'Sin descripción disponible.',
                        type: isFolder ? 'folder' : 'video',
                        original: isFolder
                            ? `https://drive.google.com/embeddedfolderview?id=${id}#grid`
                            : url,
                        preview: isFolder
                            ? `https://drive.google.com/embeddedfolderview?id=${id}#grid`
                            : `https://drive.google.com/file/d/${id}/preview`,
                        thumbnail
                    });
                });
            }
        }

        // Deduplicate
        const seen = new Set();
        results = results.filter(item => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });

        // Limit results if no query (show random or recent?) -> If no query, maybe show nothing or suggestions?
        // User asked for search. If query empty, maybe empty list.
        if (!query) results = [];

        return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Search API Error:", error);
        return new Response(JSON.stringify({ error: "Search failed" }), { status: 500 });
    }
}
