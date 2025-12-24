import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    // 1. Rutas públicas (no requieren auth)
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/favicon.ico' ||
        pathname === '/'
    ) {
        return NextResponse.next();
    }

    // 2. Verificar autenticación
    const token = req.cookies.get('session_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    try {
        const secret = new TextEncoder().encode(SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        // 3. Verificar sesión única (Llamada interna para evitar Mongoose en Edge)
        // Nota: Agregamos timestamp para evitar cualquier cache de la petición fetch
        const checkUrl = new URL('/api/auth/session-check', req.url);
        const checkRes = await fetch(checkUrl.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: payload.id, sessionId: payload.sessionId }),
            cache: 'no-store'
        });

        if (checkRes.ok) {
            const { active } = await checkRes.json();
            if (!active) {
                console.warn('Middleware: Sesión invalidada por otro inicio de sesión');
                const response = NextResponse.redirect(new URL('/login', req.url));
                response.cookies.delete('session_token');
                return response;
            }
        }

        // 4. Implementar Sliding Session y Deshabilitar Caché total
        const response = NextResponse.next();

        // Cabeceras extremas para evitar que el navegador guarde la página
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('Surrogate-Control', 'no-store');

        // Refrescar expiración de la cookie a 3 horas
        response.cookies.set('session_token', token, {
            path: '/',
            maxAge: 3 * 60 * 60,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });

        return response;

    } catch (error) {
        console.error('Middleware Security Error:', error.message);
        const response = NextResponse.redirect(new URL('/login', req.url));
        response.cookies.delete('session_token');
        return response;
    }
}

export const config = {
    matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
// Security logic v3.0 - Full Enforcement