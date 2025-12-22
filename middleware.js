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

        // 3. Verificar estado de pago
        // Si ya está en /payment, permitirlo para evitar bucle
        if (pathname === '/payment') {
            // Si el usuario YA pagó y trata de entrar a /payment, mandarlo al home
            if (payload.isPaid) {
                return NextResponse.redirect(new URL('/gallery', req.url));
            }
            return NextResponse.next();
        }

        // Si NO ha pagado, forzar redirección a /payment
        // MODIFICACION TEMPORAL: Permitir acceso aunque no haya pagado para que el usuario pueda ver la app
        // if (!payload.isPaid) {
        //    return NextResponse.redirect(new URL('/payment', req.url));
        // }

        // Si todo está bien (Logueado + Pagado), permitir acceso
        return NextResponse.next();

    } catch (error) {
        console.error('Middleware: Token inválido o expirado:', error.message);
        // Limpiar cookie y redirigir
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
