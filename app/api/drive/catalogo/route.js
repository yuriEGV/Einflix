import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const possiblePaths = [
            path.join(process.cwd(), 'data', 'drive_links.txt'),
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
            // Formato esperado: URL | Título | Categoría | Imagen (Opcional)
            const [link, title, category, customImg] = line.split('|').map(s => s.trim());

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

            // Imagen por defecto basada en la categoría si no hay customImg
            let thumbnail = customImg || `https://lh3.googleusercontent.com/u/0/d/${id}=w600-h400-n`;

            // Si no hay imagen custom y no es folder, podemos usar placeholders bonitos para categorías
            if (!customImg && category) {
                const cat = category.toLowerCase();
                if (cat.includes('pelicula')) thumbnail = `https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80`;
                if (cat.includes('serie')) thumbnail = `https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&q=80`;
                if (cat.includes('anime')) thumbnail = `https://images.unsplash.com/photo-1578632738980-433120152918?w=600&q=80`;
            }

            return {
                id,
                title: title || `Título no definido ${index + 1}`,
                category: category || (type === 'folder' ? 'Carpeta' : 'Multimedia'),
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
