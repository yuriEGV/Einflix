import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Helper for JSON response
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

// Configurar transportador de correo (mismo que registro)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function POST(req) {
    try {
        await dbConnect();
        const { email } = await req.json();

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Por seguridad, a veces es mejor decir que se envió el correo incluso si no existe el user,
            // pero aquí seguiremos la lógica previa para ayudar al usuario.
            return jsonResponse(
                { success: false, message: "No existe una cuenta con este correo" },
                404
            );
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hora

        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        // Enviar correo
        const mailOptions = {
            from: `"Einflix Support" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Recuperación de Contraseña - Einflix',
            html: `
                <div style="background-color: #000; color: #fff; padding: 40px; font-family: sans-serif; text-align: center;">
                    <h1 style="color: #D4AF37; font-size: 3rem;">EINFLIX</h1>
                    <h2>Recuperación de Contraseña</h2>
                    <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
                    <a href="${resetUrl}" style="display: inline-block; background-color: #D4AF37; color: black; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Restablecer Contraseña</a>
                    <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                    <p style="font-size: 0.8rem; color: #777;">Este enlace expirará en 1 hora.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        return jsonResponse({
            success: true,
            message: "Se ha enviado un correo de recuperación"
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);

        let userMessage = "Error al procesar la solicitud: " + error.message;
        if (error.message.includes('Authentication failed') || error.code === 'EAUTH') {
            userMessage = "Error de configuración de correo (bad auth). Por favor, contacta al administrador.";
            console.error("CRITICAL: EMAIL_USER or EMAIL_PASS is invalid/expired in environment variables.");
        }

        return jsonResponse(
            { success: false, message: userMessage },
            500
        );
    }
}
