import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

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
        const { token, password } = await req.json();

        if (!token || !password) {
            return jsonResponse({ success: false, message: "Datos incompletos" }, 400);
        }

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return jsonResponse({ success: false, message: "El token es inválido o ha expirado" }, 400);
        }

        // Hashear la nueva contraseña
        const bcryptModule = await import('bcryptjs');
        const hash = bcryptModule.hash || bcryptModule.default.hash;
        const genSalt = bcryptModule.genSalt || bcryptModule.default.genSalt;

        if (!hash || !genSalt) {
            throw new Error("Bcrypt functions not found");
        }

        const salt = await genSalt(10);
        user.password = await hash(password, salt);

        // Limpiar campos de reset
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;

        await user.save();

        return jsonResponse({
            success: true,
            message: "Contraseña actualizada correctamente"
        });

    } catch (error) {
        console.error("Reset Password Error Details:", {
            message: error.message,
            stack: error.stack
        });
        return jsonResponse({ success: false, message: "Error al restablecer la contraseña: " + error.message }, 500);
    }
}
