import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    // 1. Rutas públicas (no requieren auth)
    const isPublicRoute =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/auth') ||
        pathname === '/favicon.ico' ||
        pathname === '/';

    const token = req.cookies.get('session_token')?.value;
    let response;

    // Si es ruta pública y tiene token, verificar si debe ir al home (Gallery)
    if (isPublicRoute) {
        if (token && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
            try {
                const secret = new TextEncoder().encode(SECRET_KEY);
                await jwtVerify(token, secret);
                response = NextResponse.redirect(new URL('/gallery', req.url));
            } catch (e) {
                response = NextResponse.next();
            }
        } else {
            response = NextResponse.next();
        }
    } else {
        // 2. Verificar autenticación
        if (!token) {
            response = NextResponse.redirect(new URL('/login', req.url));
        } else {
            try {
                const secret = new TextEncoder().encode(SECRET_KEY);
                const { payload } = await jwtVerify(token, secret);

                // 3. Requerir sessionId para seguridad estricta
                if (!payload.sessionId) {
                    console.warn(`[Middleware] Token missing sessionId for ${payload.email}`);
                    response = NextResponse.redirect(new URL('/login', req.url));
                    response.cookies.delete('session_token');
                    return response;
                }

                console.log(`[Middleware] Validating ${payload.email} | SID: ${payload.sessionId}`);

                // 4. Verificar sesión única (Llamada interna con cache busting)
                const checkUrl = new URL('/api/auth/session-check', req.url);
                checkUrl.searchParams.set('t', Date.now().toString());

                let isActive = true;
                let dbSessionId = 'unknown';
                try {
                    const checkRes = await fetch(checkUrl.href, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: payload.id, sessionId: payload.sessionId }),
                        cache: 'no-store'
                    });

                    if (checkRes.ok) {
                        const data = await checkRes.json();
                        isActive = data.active;
                        dbSessionId = data.dbSessionId || 'empty';
                    }
                } catch (fetchError) {
                    console.error('[Middleware] Fetch error:', fetchError.message);
                }

                if (!isActive) {
                    console.warn(`[Middleware] Session MISMATCH for ${payload.email}. DB: ${dbSessionId} vs Token: ${payload.sessionId}`);
                    response = NextResponse.redirect(new URL('/login', req.url));
                    response.cookies.delete('session_token');
                } else {
                    // 5. Implementar Sliding Session
                    response = NextResponse.next();
                    response.cookies.set('session_token', token, {
                        path: '/',
                        maxAge: 3 * 60 * 60,
                        httpOnly: true,
                        sameSite: 'lax',
                        secure: process.env.NODE_ENV === 'production'
                    });
                }
            } catch (error) {
                console.error('Middleware Security Error:', error.message);
                response = NextResponse.redirect(new URL('/login', req.url));
                response.cookies.delete('session_token');
            }
        }
    }

    // Cabeceras extremas para deshabilitar bfcache y cache del navegador en TODA respuesta
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');

    return response;
}

export const config = {
    matcher: ['/((?!api/auth|api/stream|api/drive|api/poster|api/search|_next/static|_next/image|favicon.ico).*)'],
};
// Security logic v3.0 - Full Enforcement