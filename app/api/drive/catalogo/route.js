import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
            return NextResponse.json({ error: "Archivo de enlaces no encontrado" }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && line.includes('drive.google.com'));

        const catalog = lines.map((line, index) => {
            // Formato: URL | Título | Categoría | Imagen | Descripción
            const parts = line.split('|').map(s => s.trim());
            const [link, title, category, customImg, description] = parts;

            let id = '';
            let type = 'video';

            if (link.includes('/folders/')) {
                id = link.split('/folders/')[1].split('?')[0].split('/')[0];
                type = 'folder';
            } else if (link.includes('/file/d/')) {
                id = link.split('/file/d/')[1].split('/')[0].split('?')[0];
                type = 'video';
            } else if (link.includes('id=')) {
                id = link.split('id=')[1].split('&')[0];
            }

            if (!id) return null;

            // Elección de miniatura con prioridades inteligentes
            let thumbnail = customImg || `https://lh3.googleusercontent.com/u/0/d/${id}=w600-h400-n`;

            // Mapeo extendido para forzar imágenes temáticas si es de Google Drive (que suelen fallar)
            // o si coincide la categoría.
            const cat = (category || "").toLowerCase();
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

            // Si la imagen actual es de drive (que no cargan bien) o no hay imagen, buscamos por categoría
            if (!customImg || customImg.includes('drive.google.com/thumbnail')) {
                for (const [key, url] of Object.entries(categoryImages)) {
                    if (cat.includes(key)) {
                        thumbnail = url;
                        break;
                    }
                }
            }

            return {
                id,
                title: title || `Contenido ${index + 1}`,
                category: category || (type === 'folder' ? 'Carpeta' : 'Multimedia'),
                description: description || 'Sin descripción disponible.',
                type,
                original: link,
                preview: `https://drive.google.com/file/d/${id}/preview`,
                thumbnail: thumbnail
            };
        }).filter(Boolean);

        return NextResponse.json(catalog);
    } catch (error) {
        console.error("Error en la API de Catalogo:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
