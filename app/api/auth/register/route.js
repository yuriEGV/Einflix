import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
    try {
        await dbConnect();
        const { name, email, password } = await req.json();

        // Verificar si el usuario ya existe
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return NextResponse.json(
                { success: false, message: "El correo ya está registrado" },
                { status: 400 }
            );
        }

        // Crear usuario
        const user = await User.create({
            name,
            email,
            password,
        });

        return NextResponse.json({
            success: true,
            message: "Usuario registrado con éxito",
            user: { id: user._id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error("Register Error:", error);
        return NextResponse.json(
            { success: false, message: "Error al registrar usuario" },
            { status: 500 }
        );
    }
}
