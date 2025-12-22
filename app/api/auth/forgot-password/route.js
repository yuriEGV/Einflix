import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import crypto from 'crypto';

// Helper for JSON response
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

export async function POST(req) {
    try {
        await dbConnect();
        const { email } = await req.json();

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
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

        // AQUÍ IRÍA EL ENVÍO DE CORREO (SendGrid, Nodemailer, etc.)
        // Por ahora solo devolvemos el token para pruebas

        return jsonResponse({
            success: true,
            message: "Se ha enviado un correo de recuperación",
            token: resetToken
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return jsonResponse(
            { success: false, message: "Error al procesar la solicitud" },
            500
        );
    }
}
