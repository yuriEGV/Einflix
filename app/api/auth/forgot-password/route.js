import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import crypto from 'crypto';

export async function POST(req) {
    try {
        await dbConnect();
        const { email } = await req.json();

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Si el correo está registrado, recibirás un enlace" },
                { status: 200 } // Por seguridad devolvemos 200
            );
        }

        // Generar token de recuperación
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hora
        await user.save();

        // TODO: Implementar nodemailer para envío real.
        // Por ahora simulamos que se envió.
        console.log(`Reset Token para ${email}: ${resetToken}`);

        return NextResponse.json({
            success: true,
            message: "Se ha enviado un enlace de recuperación a tu correo"
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json(
            { success: false, message: "Error al procesar la solicitud" },
            { status: 500 }
        );
    }
}
