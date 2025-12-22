import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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
    console.log("=== REGISTER REQUEST ===");
    try {
        await dbConnect();

        // Safe body parsing
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("Error parsing body:", e);
            throw new Error("Invalid XML/JSON body");
        }

        const { name, email, password } = body;
        console.log("Registering:", email);

        // Verificar si el usuario ya existe
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return jsonResponse(
                { success: false, message: "El correo ya está registrado" },
                400
            );
        }

        // Crear usuario
        // Hashing manual
        console.log("Importing bcrypt...");
        const bcryptModule = await import('bcryptjs');
        const bcrypt = bcryptModule.default || bcryptModule;

        console.log("Hashing password...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        console.log("User created:", user._id);

        return jsonResponse({
            success: true,
            message: "Usuario registrado con éxito",
            user: { id: user._id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error("Register Error:", error);
        return jsonResponse(
            { success: false, message: "Error al registrar usuario: " + error.message },
            500
        );
    }
}
