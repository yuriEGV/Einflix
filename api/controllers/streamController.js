import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Transmitir archivos multimedia (streaming basico)
export async function streamMedia(req, res) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, '../uploads/', req.params.filename);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).end('Archivo no encontrado');
    }

    const range = req.headers.range;
    if (!range) {
      return res.status(416).send('Requiere header Range');
    }

    const [start, end] = range.replace(/bytes=/, '').split('-');
    const startNum = parseInt(start, 10);
    const endNum = end ? parseInt(end, 10) : stats.size - 1;
    const chunkSize = (endNum - startNum) + 1;
    const stream = fs.createReadStream(filePath, { start: startNum, end: endNum });
    res.writeHead(206, {
      'Content-Range': `bytes ${startNum}-${endNum}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });
    stream.pipe(res);
  });
}
