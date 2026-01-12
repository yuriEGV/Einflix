import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { encryptId } from '@/lib/drive';

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
        let planFolder = 'basic'; // Default fallback

        // 2. Definir acceso por Plan o Cuenta Especial
        const specialAccounts = ['yguajardov@gmail.com', 'vicente@einflix.com'];

        let userEmail = '';
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
                        userEmail = user.email;
                        if (specialAccounts.includes(user.email)) {
                            planFolder = 'total G';
                            console.log(`CATALOG: Admin access for ${user.email} -> total G`);
                        } else if (user.isPaid) {
                            const type = (user.planType || 'basic').toLowerCase();
                            if (type.includes('total')) planFolder = 'total P';
                            else if (type.includes('medium')) planFolder = 'medium';
                            else planFolder = 'basic';
                        }
                    }
                }
            } catch (e) {
                console.error("Error identifying user for catalog folder selection:", e);
            }
        }

        const planDir = path.join(dataDir, planFolder);
        console.log(`CATALOG CONFIG: Assigned folder -> ${planFolder}`);

        let allowedFiles = [];
        if (fs.existsSync(planDir)) {
            const files = fs.readdirSync(planDir);
            allowedFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.json'));
        } else {
            console.error(`CATALOG ERROR: Plan directory not found: ${planDir}`);
        }

        console.log(`CATALOG DEBUG: Processing ${allowedFiles.length} files from ${planFolder}`);

        const fileCategories = {
            'peliculas.txt': 'Película',
            'series.txt': 'Serie',
            'comics.txt': 'Comic',
            'musica.txt': 'Música',
            'karaoke.txt': 'Karaoke',
            'libros.txt': 'Libro',
            'otros.txt': 'Otros',
            'CLASICOS.txt': 'Clásicos',
            'Religiosas.txt': 'Religiosas',
            'Series Animadas.txt': 'Series Animadas',
            'South Park.txt': 'South Park',
            'Los Magnificos.txt': 'Serie Clásica',
            'Los Monster.txt': 'Serie Clásica',
            'Los Tres Chiflados.txt': 'Humor',
            'Mi Bella Genio.txt': 'Serie Clásica',
            'Series de Terror.txt': 'Terror',
            'Super Agente 86.txt': 'Serie Clásica'
        };

        let rawItems = [];

        for (const filename of allowedFiles) {
            const defaultCategory = fileCategories[filename] || filename.replace('.txt', '');
            const filePath = path.join(planDir, filename);

            if (fs.existsSync(filePath)) {
                console.log(`CATALOG: Processing file ${filename} from ${planFolder}`);

                if (filename === 'CLASICOS.txt') {
                    console.log(`CATALOG DEBUG: CLASICOS.txt exists at ${filePath}`);
                }
                if (filename.endsWith('.txt') && !filename.includes('json')) {
                    // Standard TXT processing
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split('\n').filter(line => line.trim());

                    if (filename === 'CLASICOS.txt') {
                        console.log(`CATALOG DEBUG: Parsing CLASICOS.txt. Found ${lines.length} lines.`);
                    }

                    const fileItems = lines.map(line => {
                        const parts = line.split('|').map(p => p.trim());
                        const url = parts[0] || '';

                        if (filename === 'CLASICOS.txt') {
                            console.log(`CATALOG DEBUG: Processing line: ${line}`);
                            console.log(`CATALOG DEBUG: Extracted URL: ${url}, ID Match: ${url.match(/[-\w]{25,}/)}`);
                        }

                        let id = null;
                        if (url.startsWith('local-')) {
                            id = url;
                        } else {
                            const idMatch = url.match(/[-\w]{25,}/);
                            id = idMatch ? idMatch[0] : null;
                        }

                        if (!id) {
                            if (filename === 'CLASICOS.txt') console.log(`CATALOG DEBUG: ID NOT FOUND for line in CLASICOS.txt`);
                            return null;
                        }

                        // FALLBACK: If title is missing (parts[1]), use the filename (without .txt)
                        const category = parts[2] || defaultCategory;
                        const title = parts[1] || defaultCategory;

                        let contentType = 'video';
                        if (['Libro', 'Comic', 'Biblioteca', 'Galería', 'Lectura', 'Documentos'].includes(category)) contentType = 'pdf';
                        else if (['Música', 'Karaoke'].includes(category)) contentType = 'audio';

                        // IMPROVED DETECTION: Ensure drive folders are always identified even without parts[7]
                        const isDriveFolder = url.includes('/folders/') || url.includes('embeddedfolderview');

                        return {
                            id,
                            title: title,
                            tags: [category],
                            cover: parts[3] || null,
                            description: parts[4] || 'Sin descripción disponible.',
                            folderUrl: url,
                            contentType: parts[7] || (isDriveFolder ? 'drive' : contentType)
                        };
                    }).filter(Boolean);

                    if (filename === 'CLASICOS.txt') {
                        console.log(`CATALOG DEBUG: CLASICOS.txt yielded ${fileItems.length} valid items.`);
                        if (fileItems.length > 0) {
                            console.log(`CATALOG DEBUG: First CLASICOS item: ${JSON.stringify(fileItems[0])}`);
                        }
                    }

                    rawItems = rawItems.concat(fileItems);
                } else if (filename.includes('json')) {
                    // JSON or TXT-JSON processing
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const jsonData = JSON.parse(content);
                        const jsonItems = jsonData.map(item => {
                            const url = item.url || '';
                            const idMatch = url.match(/[-\w]{25,}/);
                            const id = idMatch ? idMatch[0] : null;
                            if (!id) return null;

                            const category = item.categoria || defaultCategory;
                            let contentType = 'video';
                            if (['Libro', 'Comic', 'Biblioteca', 'Galería', 'Lectura', 'Documentos'].includes(category)) contentType = 'pdf';
                            else if (['Música', 'Karaoke'].includes(category)) contentType = 'audio';

                            return {
                                id,
                                title: item.titulo || item.categoria || `Contenido ${id.slice(0, 6)}`,
                                tags: [category],
                                cover: item.thumbnail || null,
                                description: item.descripcion || 'Sin descripción disponible.',
                                folderUrl: url,
                                contentType: url.includes('/folders/') ? 'drive' : contentType
                            };
                        }).filter(Boolean);
                        rawItems = rawItems.concat(jsonItems);
                    } catch (e) {
                        console.error(`Error parsing JSON file ${filename}:`, e);
                    }
                }
            }
        }

        // --- INTEGRATION: JSON PUBLIC DOMAIN FILMS ---
        // Always include Public Domain films regardless of plan
        const jsonPath = path.join(dataDir, 'enflix_public_domain_films.json');
        if (fs.existsSync(jsonPath)) {
            try {
                const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                const jsonData = JSON.parse(jsonContent);

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
                console.log(`CATALOG: Added ${jsonItems.length} public domain films from JSON.`);
            } catch (err) {
                console.error("CATALOG: Error parsing public domain JSON:", err);
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

            const contentType = item.contentType || 'video';
            const isFolder = contentType === 'drive' ||
                (item.folderUrl ? (item.folderUrl.includes('/folders/') || item.folderUrl.includes('embeddedfolderview')) : false);
            const type = isFolder ? 'folder' : contentType;

            // Determinar categoría principal
            const tags = item.tags || [];
            let category = tags[0] || (isFolder ? 'Carpeta' : 'Multimedia');
            category = category.charAt(0).toUpperCase() + category.slice(1);

            // Thumbnail inteligente para evitar bloqueos CORB (Cross-Origin Read Blocking)
            // Fix: Usar proxy local para evitar problemas de CORS en el frontend
            let thumbnail = item.cover || `/api/drive/thumbnail?id=${id}`;

            // Si la URL es la de thumbnail estándar de drive, preferimos el proxy o una temática
            if (thumbnail.includes('drive.google.com') || thumbnail.includes('googleusercontent.com')) {
                const lowTags = tags.map(t => t.toLowerCase());
                let foundThematic = false;
                for (const [key, url] of Object.entries(categoryImages)) {
                    if (lowTags.includes(key) || category.toLowerCase().includes(key)) {
                        thumbnail = url;
                        foundThematic = true;
                        break;
                    }
                }

                // Si no hay temática, usamos el proxy
                if (!foundThematic && id) {
                    thumbnail = `/api/drive/thumbnail?id=${id}`;
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
        }).filter(item => {
            if (!item) return false;
            // Filter out items with fallback title "Contenido ..." as requested by user
            if (item.title && item.title.startsWith('Contenido ')) return false;
            return true;
        });

        const clasicosDebug = catalog.find(i => i.title.includes('Clasicos'));
        console.log("CATALOG DEBUG: Check Clasicos in catalog:", clasicosDebug ? "FOUND" : "NOT FOUND");

        // 1. Eliminar duplicados por ID
        const seen = new Set();
        catalog = catalog.filter(item => {
            const duplicate = seen.has(item.id);
            seen.add(item.id);
            return !duplicate;
        });

        // 2. Ordenar alfabéticamente por título
        catalog.sort((a, b) => a.title.localeCompare(b.title));

        // 3. ENCRYPTION & PROXYING PASS
        const finalCatalog = catalog.map(item => {
            const safeId = item.id.startsWith('ef-') ? item.id : encryptId(item.id);
            const isFolder = item.type === 'folder';

            return {
                ...item,
                id: safeId,
                thumbnail: `/api/poster/${safeId}`,
                original: isFolder ? `/api/drive/list?id=${safeId}` : `/api/stream/${safeId}`,
                preview: isFolder ? `/api/drive/list?id=${safeId}` : `/api/stream/${safeId}`
            };
        });

        return new Response(JSON.stringify(finalCatalog), {
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
