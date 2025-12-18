import fs from 'fs';
import path from 'path';

/**
 * Extrae el ID de una URL de Google Drive (archivo o carpeta)
 */
const extractId = (url) => {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
};

export const getDriveLinks = (req, res) => {
  const filePath = path.join(process.cwd(), 'data', 'drive_links.txt');

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
    console.error('Error leyendo drive_links.txt', err);
    res.status(500).json({ error: 'No se pudo leer el archivo' });
  }
};

/**
 * Sirve el catálogo multimedia en formato JSON para el frontend
 */
export const getCatalogo = (req, res) => {
  const filePath = path.join(process.cwd(), 'data', 'drive_links.txt');

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo de enlaces no encontrado' });
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const videos = data.split('\n')
      .map(line => {
        const id = extractId(line);
        if (!id) return null;

        const isFolder = line.includes('/folders/');

        return {
          id,
          original: line,
          preview: isFolder
            ? `https://drive.google.com/embeddedfolderview?id=${id}#grid`
            : `https://drive.google.com/file/d/${id}/preview`,
          thumbnail: `https://drive.google.com/thumbnail?id=${id}&sz=w600`,
          title: isFolder ? `Folder ${id.slice(0, 8)}` : `Video ${id.slice(0, 8)}`,
          type: isFolder ? 'folder' : 'video'
        };
      })
      .filter(Boolean);

    res.json(videos);
  } catch (err) {
    console.error('Error procesando catálogo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
