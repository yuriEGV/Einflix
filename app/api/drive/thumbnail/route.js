// import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return new Response('Missing ID', { status: 400 });
    }

    // Use /d/ format which is more reliable for direct access and proxies
    const driveUrl = `https://lh3.googleusercontent.com/d/${id}=w800`;

    try {
        const response = await fetch(driveUrl);

        if (!response.ok) {
            // Try fallback to Unsplash if Drive fails
            throw new Error(`Failed to fetch from Drive: ${response.status}`);
        }

        const blob = await response.blob();
        const headers = new Headers();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
        headers.set('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas

        return new Response(blob, { headers });
    } catch (error) {
        console.error('Thumbnail Proxy Error:', error);
        // Fallback a una imagen genérica si falla
        return new Response(null, {
            status: 307,
            headers: {
                'Location': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80'
            }
        });
    }
}
