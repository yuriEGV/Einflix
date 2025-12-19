import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@einflix.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'einflix2024';

export async function POST(req) {
    try {
        const { email, password } = await req.json();

        // Validación básica
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            const secret = new TextEncoder().encode(SECRET_KEY);

            // Crear el token con expiración de 3 horas
            const token = await new SignJWT({ email })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('3h')
                .sign(secret);

            const response = NextResponse.json({ success: true, message: "Login exitoso" });

            // Configurar la cookie de sesión (3 horas)
            response.cookies.set('session_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 3 * 60 * 60, // 3 horas en segundos
                path: '/',
            });

            return response;
        }

        return NextResponse.json(
            { success: false, message: "Credenciales inválidas" },
            { status: 401 }
        );
    } catch (error) {
        console.error("Login Error:", error);
        return NextResponse.json(
            { success: false, message: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
