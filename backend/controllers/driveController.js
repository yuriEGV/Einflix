import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extrae el ID de una URL de Google Drive (archivo o carpeta)
 */
const extractId = (url) => {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
};

export const getDriveLinks = (req, res) => {
  let filePath = path.join(__dirname, 'data', 'drive_links.txt');

  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', 'data', 'drive_links.txt');
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const links = content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const embedLinks = links.map(link => {
      const fileId = extractId(link);
      return fileId
        ? `https://drive.google.com/uc?export=view&id=${fileId}`
        : link;
    });

    res.render('gallery', { items: embedLinks });

  } catch (err) {
    console.error('Error leyendo drive_links.txt:', err.message, 'Path:', filePath);
    res.status(500).json({ error: 'No se pudo leer el archivo' });
  }
};

/**
 * Sirve el catálogo multimedia en formato JSON para el frontend
 */
export const getCatalogo = (req, res) => {
  let filePath = path.join(__dirname, 'data', 'drive_links.txt');

  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', 'data', 'drive_links.txt');
  }

  try {
    if (!fs.existsSync(filePath)) {
      console.error('Archivo no encontrado en:', filePath);
      return res.status(404).json({ error: 'Archivo de enlaces no encontrado' });
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // El archivo contiene objetos JSON separados por comas y saltos de línea.
    let jsonContent = content.trim();
    if (!jsonContent.startsWith('[')) {
      jsonContent = '[' + jsonContent.replace(/,$/, '') + ']';
    }

    let rawItems = [];
    try {
      rawItems = JSON.parse(jsonContent);
    } catch (e) {
      const matches = content.match(/\{[\s\S]*?\}/g);
      if (matches) {
        rawItems = matches.map(m => {
          try { return JSON.parse(m); } catch { return null; }
        }).filter(Boolean);
      }
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
      'einflix': 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80'
    };

    let catalog = rawItems.map((item) => {
      const id = item.id;
      if (!id) return null;

      const isFolder = item.folderUrl ? item.folderUrl.includes('/folders/') : true;
      const type = isFolder ? 'folder' : 'video';

      const tags = item.tags || [];
      let category = tags[0] || (isFolder ? 'Carpeta' : 'Multimedia');
      category = category.charAt(0).toUpperCase() + category.slice(1);

      let thumbnail = item.cover || `/api/drive/thumbnail?id=${id}`;
      if (thumbnail.includes('drive.google.com/thumbnail')) {
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

    res.json(catalog);
  } catch (err) {
    console.error('Error procesando catálogo:', err.message, 'Path:', filePath);
    res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
  }
};
