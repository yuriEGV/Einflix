import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        // En Vercel, process.cwd() suele ser la raíz del proyecto (donde está el frontend)
        // Intentamos varias rutas posibles para mayor robustez
        const possiblePaths = [
            path.join(process.cwd(), 'data', 'drive_links.txt'),
            path.join(process.cwd(), 'frontend', 'data', 'drive_links.txt'),
            path.join(process.cwd(), '..', 'data', 'drive_links.txt'), // Por si acaso
        ];

        let filePath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                filePath = p;
                break;
            }
        }

        if (!filePath) {
            console.error("No se encontró drive_links.txt en ninguna de las rutas:", possiblePaths);
            return NextResponse.json({ error: "Archivo de enlaces no encontrado" }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const links = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && line.includes('drive.google.com'));

        const catalog = links.map((link, index) => {
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

            return {
                id,
                title: `Contenido ${index + 1}`,
                type,
                original: link,
                preview: `https://drive.google.com/file/d/${id}/preview`,
                thumbnail: `https://lh3.googleusercontent.com/u/0/d/${id}=w600-h400-n`
            };
        }).filter(Boolean);

        return NextResponse.json(catalog);
    } catch (error) {
        console.error("Error en la API de Catalogo:", error);
        return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
    }
}
