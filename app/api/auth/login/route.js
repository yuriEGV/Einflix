import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

export async function POST(req) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        // Buscar usuario en la base de datos
        const user = await User.findOne({ email: email.toLowerCase() });

        if (user && (await user.comparePassword(password))) {
            const secret = new TextEncoder().encode(SECRET_KEY);

            // Crear el token con expiración de 3 horas e información de pago
            const token = await new SignJWT({
                email: user.email,
                id: user._id,
                name: user.name,
                isPaid: user.isPaid || false
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setIssuedAt()
                .setExpirationTime('3h')
                .sign(secret);

            const response = NextResponse.json({
                success: true,
                message: "Login exitoso",
                user: { name: user.name, email: user.email }
            });

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
            { success: false, message: "Correo o contraseña incorrectos" },
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
