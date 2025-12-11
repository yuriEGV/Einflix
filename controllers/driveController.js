import fs from 'fs';
import path from 'path';

export const getDriveLinks = (req, res) => {
  const filePath = path.join(process.cwd(), 'data', 'drive_links.txt');

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const links = content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const embedLinks = links.map(link => {
      if (link.includes('drive.google.com')) {
        const idMatch = link.match(/[-\w]{25,}/);
        const fileId = idMatch ? idMatch[0] : null;
        return fileId
          ? `https://drive.google.com/uc?export=view&id=${fileId}`
          : link;
      }
      return link;
    });

    res.render('gallery', { items: embedLinks });

  } catch (err) {
    console.error('Error leyendo drive_links.txt', err);
    res.status(500).json({ error: 'No se pudo leer el archivo' });
  }
};
