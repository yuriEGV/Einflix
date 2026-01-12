// filepath: /app/api/poster/route.js
// ...existing code...
import { google } from 'googleapis';
export async function GET(request, { params }) {
  const fileId = params.id;
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) return new Response('Server error: missing Google credentials', { status: 500 });
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  const drive = google.drive({ version: 'v3', auth });
  try {
    const metaRes = await drive.files.get({ fileId, fields: 'id,name,mimeType' });
    const meta = metaRes.data || {};
    const mime = meta.mimeType || 'application/octet-stream';
    let driveRes;
    let contentType = mime;
    if (mime && mime.startsWith('application/vnd.google-apps.')) {
      // Exportar Google Docs/Sheets/Slides a PDF para visualización
      try {
        driveRes = await drive.files.export({ fileId, mimeType: 'application/pdf' }, { responseType: 'stream' });
        contentType = 'application/pdf';
      } catch (exportErr) {
        console.error('Drive export error', exportErr);
        return new Response('El archivo no es exportable a binario desde Drive.', { status: 403 });
      }
    } else {
      // Archivos binarios (pdf, mp3, images, etc.)
      driveRes = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
      contentType = mime;
    }
    const stream = driveRes.data;
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=3600');
    const filename = meta.name ? meta.name.replace(/["']/g, '') : fileId;
    headers.set('Content-Disposition', `inline; filename="${filename}"`);
    return new Response(stream, { status: 200, headers });
  } catch (err) {
    console.error('Poster fetch error', err);
    const msg = err?.cause?.message || err.message || String(err);
    return new Response('Error fetching file from Drive: ' + msg, { status: err?.code || 500 });
  }
}
// ...existing code...
