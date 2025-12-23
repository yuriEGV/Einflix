import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

export async function GET(req) {
    try {
        // 1. Obtener User Plan del Token (o DB si queremos data fresca, pero Token es más rápido)
        // Para cambios inmediatos mejor consultar DB si el token puede estar desactualizado, 
        // pero por eficiencia usaremos el token o asumiremos que el frontend refresca el token al pagar.
        // DADO que el callback redirige, el cliente DEBERIA refrescar su sesión/token, 
        // pero Next.js App Router a veces mantiene cookies viejas.
        // Vamos a leer la cookie directamente.

        const token = req.cookies.get('session_token')?.value;
        let planType = 'none';

        if (token) {
            try {
                const secret = new TextEncoder().encode(SECRET_KEY);
                const { payload } = await jwtVerify(token, secret);
                // IMPORTANTE: En un escenario real, deberíamos consultar el User en DB para ver si el plan cambió RECIENTEMENTE
                // y no confiar solo en el token viejo. Pero para este MVP confiamos en que 'isPaid' del token sea actualizado o 
                // consultamos DB si queremos ser estrictos.
                // Consultemos DB para estar seguros ya que acabamos de pagar.
                const User = (await import('@/models/User')).default;
                const dbConnect = (await import('@/lib/mongodb')).default;
                await dbConnect();

                // Validate payload.id format
                if (payload.id && typeof payload.id === 'string' && payload.id.match(/^[0-9a-fA-F]{24}$/)) {
                    const user = await User.findById(payload.id);
                    if (user) {
                        // Debug Log
                        console.log(`CATALOG CHECK: User Found: ${user.email}, Plan: ${user.planType}, Paid: ${user.isPaid}`);
                        // Only allow access if user is paid OR if we want to allow access to basic plan even if isPaid is false (as a trial? No, user strict)
                        // Wait, if register sets plan but isPaid is false (default), they see nothing?
                        // User said "register and select plan", but didn't pay yet?
                        // If "isPaid" is false, we might want to show at least "libros" if plan is basic?
                        // For now, adhere to isPaid check.
                        if (user.isPaid) {
                            planType = user.planType || 'basic';
                        } else {
                            console.log(`CATALOG CHECK: User ${user.email} IS NOT PAID.`);
                        }
                    } else {
                        console.log("CATALOG CHECK: User not found in DB");
                    }
                } else {
                    console.error("Invalid ID in token payload:", payload.id);
                }
            } catch (e) {
                console.error("Token verification failed in catalog:", e);
            }
        }

        const dataDir = path.join(process.cwd(), 'data');
        let allowedFiles = [];

        console.log(`CATALOG FILTER: Effective Plan: ${planType}`);

        // 2. Definir acceso por Plan
        if (planType === 'total') {
            allowedFiles = ['peliculas.txt', 'series.txt', 'comics.txt', 'musica.txt', 'karaoke.txt', 'libros.txt', 'otros.txt'];
        } else if (planType === 'medium') {
            allowedFiles = ['peliculas.txt', 'series.txt'];
        } else if (planType === 'basic') {
            allowedFiles = ['libros.txt'];
        } else {
            allowedFiles = [];
        }

        console.log(`CATALOG FILTER: Allowed Files: ${JSON.stringify(allowedFiles)}`);

        const fileCategories = {
            'peliculas.txt': 'Película',
            'series.txt': 'Serie',
            'comics.txt': 'Comic',
            'musica.txt': 'Música',
            'karaoke.txt': 'Karaoke',
            'libros.txt': 'Libro',
            'otros.txt': 'Otros'
        };

        let rawItems = [];

        for (const [filename, defaultCategory] of Object.entries(fileCategories)) {
            // Filter: Only process if filename is in allowedFiles
            if (!allowedFiles.includes(filename)) continue;

            const filePath = path.join(dataDir, filename);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(line => line.trim());

                const fileItems = lines.map(line => {
                    const parts = line.split('|').map(p => p.trim());
                    const url = parts[0] || '';
                    const idMatch = url.match(/[-\w]{25,}/);
                    const id = idMatch ? idMatch[0] : null;

                    if (!id) return null;

                    return {
                        id,
                        title: parts[1] || `Contenido ${id.slice(0, 6)}`,
                        // Use category from file if tag is missing, otherwise use tag
                        tags: parts[2] ? [parts[2]] : [defaultCategory],
                        cover: parts[3] || null,
                        description: parts[4] || 'Sin descripción disponible.',
                        folderUrl: url
                    };
                }).filter(Boolean);

                rawItems = rawItems.concat(fileItems);
            }
        }

        // Fallback removed to enforce plan security. 
        // If rawItems is empty, it means the user has no access or the files are empty.
        // We should not default to showing everything from the legacy file.

        if (rawItems.length === 0) {
            console.log("CATALOG: No items found for the current plan.");
        }

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

            // Thumbnail inteligente para evitar bloqueos CORB (Cross-Origin Read Blocking)
            let thumbnail = item.cover || `https://lh3.googleusercontent.com/u/0/d/${id}=w800-iv1`;

            // Si la URL es la de thumbnail estándar de drive, preferimos el proxy lh3 o una temática
            if (thumbnail.includes('drive.google.com/thumbnail') || thumbnail.includes('drive.google.com/drive')) {
                const lowTags = tags.map(t => t.toLowerCase());
                let foundThematic = false;
                for (const [key, url] of Object.entries(categoryImages)) {
                    if (lowTags.includes(key) || category.toLowerCase().includes(key)) {
                        thumbnail = url;
                        foundThematic = true;
                        break;
                    }
                }

                // Si no hay temática, usamos el visor directo de thumbnails de alta calidad
                if (!foundThematic && id) {
                    thumbnail = `https://lh3.googleusercontent.com/u/0/d/${id}=w800-iv1`;
                }
            }

            return {
                id,
                title: item.title || `Contenido ${id.slice(0, 6)}`,
                category: category,
                description: item.description || 'Sin descripción disponible.',
                type,
                // SECURITY: Force embedded view for folders to prevent users from adding/removing files
                original: isFolder
                    ? `https://drive.google.com/embeddedfolderview?id=${id}#grid`
                    : item.folderUrl || `https://drive.google.com/file/d/${id}/view`,
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
