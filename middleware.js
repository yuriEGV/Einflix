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

        // 3. Verificar sesión única (Single-Device Session)
        // Usamos una llamada a la API interna porque Mongoose no es compatible con el Edge Runtime del Middleware
        const checkRes = await fetch(new URL('/api/auth/session-check', req.url).href, {
            method: 'POST',
            body: JSON.stringify({ id: payload.id, sessionId: payload.sessionId }),
            headers: { 'Content-Type': 'application/json' }
        });

        const { active } = await checkRes.json();

        if (!active) {
            console.warn('Middleware: Sesión invalidada por otro inicio de sesión');
            const response = NextResponse.redirect(new URL('/login', req.url));
            response.cookies.delete('session_token');
            return response;
        }

        // 4. Verificar estado de pago
        if (pathname === '/payment') {
            if (payload.isPaid) {
                return NextResponse.redirect(new URL('/gallery', req.url));
            }
            return NextResponse.next();
        }

        // 5. Implementar Sliding Session (actualizar expiración a 3 horas desde ahora)
        const response = NextResponse.next();

        // Agregar cabeceras para evitar caché del navegador (evita que el botón "atrás" muestre contenido sensible)
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        // Refrescar la cookie de sesión
        response.cookies.set('session_token', token, {
            path: '/',
            maxAge: 3 * 60 * 60, // 3 horas
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production'
        });

        return response;

    } catch (error) {
        console.error('Middleware: Token inválido o expirado:', error.message);
        const response = NextResponse.redirect(new URL('/login', req.url));
        response.cookies.delete('session_token');
        return response;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth endpoints)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
    ],
};
