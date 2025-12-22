import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const possiblePaths = [
            path.join(process.cwd(), 'data', 'drive_links.txt'),
            path.join(process.cwd(), 'backend', 'data', 'drive_links.txt'),
            path.join(process.cwd(), 'frontend', 'data', 'drive_links.txt'), // Legacy
        ];

        let filePath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                filePath = p;
                break;
            }
        }

        if (!filePath) {
            return new Response(JSON.stringify({ error: "Archivo de enlaces no encontrado" }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        let rawItems = lines.map(line => {
            const parts = line.split('|').map(p => p.trim());
            const url = parts[0] || '';
            const idMatch = url.match(/[-\w]{25,}/);
            const id = idMatch ? idMatch[0] : null;

            if (!id) return null;

            return {
                id,
                title: parts[1] || `Contenido ${id.slice(0, 6)}`,
                tags: parts[2] ? [parts[2]] : [],
                cover: parts[3] || null,
                description: parts[4] || 'Sin descripción disponible.',
                folderUrl: url
            };
        }).filter(Boolean);

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
            'einflix': 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80'
        };

        // Procesar y mapear los items
        let catalog = rawItems.map((item) => {
            const id = item.id;
            if (!id) return null;

            const isFolder = item.folderUrl ? item.folderUrl.includes('/folders/') : true;
            const type = isFolder ? 'folder' : 'video';

            // Determinar categoría principal
            const tags = item.tags || [];
            let category = tags[0] || (isFolder ? 'Carpeta' : 'Multimedia');
            category = category.charAt(0).toUpperCase() + category.slice(1);

            // Thumbnail inteligente
            let thumbnail = item.cover || `/api/drive/thumbnail?id=${id}`;
            if (thumbnail.includes('drive.google.com/thumbnail')) {
                // Forzar imagen temática si la de drive suele faller
                const lowTags = tags.map(t => t.toLowerCase());
                for (const [key, url] of Object.entries(categoryImages)) {
                    if (lowTags.includes(key)) {
                        thumbnail = url;
                        break;
                    }
                }
            }

            return {
                id,
                title: item.title || `Contenido ${id.slice(0, 6)}`,
                category: category,
                description: item.description || 'Sin descripción disponible.',
                type,
                original: item.folderUrl || `https://drive.google.com/file/d/${id}/view`,
                preview: isFolder
                    ? `https://drive.google.com/embeddedfolderview?id=${id}#grid`
                    : `https://drive.google.com/file/d/${id}/preview`,
                thumbnail: thumbnail
            };
        }).filter(Boolean);

        // 1. Eliminar duplicados por ID
        const seen = new Set();
        catalog = catalog.filter(item => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });

        // 2. Ordenar alfabéticamente por título
        catalog.sort((a, b) => a.title.localeCompare(b.title));

        return new Response(JSON.stringify(catalog), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Error en la API de Catalogo:", error);
        return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
