import { SignJWT } from 'jose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

// Helper for JSON response
function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
    });
}

export async function POST(req) {
    console.log("=== LOGIN REQUEST ===");
    try {
        await dbConnect();

        // Ensure we only parse JSON once
        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.error("Error parsing body:", e);
            throw new Error("Invalid XML/JSON body");
        }

        const { email, password } = body;

        // Busqueda insensible a mayúsculas
        const user = await User.findOne({ email: email.toLowerCase() });

        if (user && (await user.comparePassword(password))) {
            const secret = new TextEncoder().encode(SECRET_KEY);

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

            const response = jsonResponse({
                success: true,
                message: "Login exitoso",
                user: { name: user.name, email: user.email }
            });

            // Set cookie manually
            // Note: Response.cookies is a Next.js extension on NextResponse.
            // With standard Response, we set Set-Cookie header.
            const cookieValue = `session_token=${token}; Path=/; Max-Age=${3 * 60 * 60}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
            response.headers.append('Set-Cookie', cookieValue);

            return response;
        }

        return jsonResponse(
            { success: false, message: "Correo o contraseña incorrectos" },
            401
        );
    } catch (error) {
        console.error("Login Error:", error);
        return jsonResponse(
            { success: false, message: "Error interno del servidor: " + error.message },
            500
        );
    }
}
