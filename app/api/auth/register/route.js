import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { SignJWT } from 'jose';

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

        const { name, email, password, planType } = body;

        if (!name || !email || !password) {
            return jsonResponse(
                { success: false, message: "Todos los campos (nombre, email, contraseña) son requeridos" },
                400
            );
        }

        console.log("Registering:", email, "Plan:", planType);

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
        const bcrypt = bcryptModule.hash || bcryptModule.default.hash;

        if (!bcrypt) {
            throw new Error("Bcrypt hash function not found");
        }

        console.log("Hashing password...");
        // In bcryptjs 3.x, some methods might be simplified or changed
        // Using the same salt generation as before but ensuring function availability
        const genSalt = bcryptModule.genSalt || bcryptModule.default.genSalt;
        const salt = await genSalt(10);
        const hashedPassword = await (bcryptModule.hash || bcryptModule.default.hash)(password, salt);

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            planType: planType || 'basic'
        });

        console.log("User created:", user._id);

        // --- Generate Token for Auto-Login ---
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'einflix_super_secret_key_2024');
        const token = await new SignJWT({
            email: user.email,
            id: user._id.toString(),
            name: user.name,
            isPaid: false
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('3h')
            .sign(secret);

        const response = jsonResponse({
            success: true,
            message: "Usuario registrado con éxito",
            user: { id: user._id, name: user.name, email: user.email }
        });

        const cookieValue = `session_token=${token}; Path=/; Max-Age=${3 * 60 * 60}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        response.headers.append('Set-Cookie', cookieValue);

        // --- Enviar Correo de Bienvenida ---
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                console.log("Configuring email transporter...");
                const nodemailer = (await import('nodemailer')).default;
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: '¡Bienvenido a Einflix!',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h1 style="color: #E50914;">Bienvenido a Einflix</h1>
                            <p>Hola <strong>${name}</strong>,</p>
                            <p>Gracias por registrarte en nuestra plataforma.</p>
                            <p>Tus credenciales de acceso son:</p>
                            <ul>
                                <li><strong>Email:</strong> ${email}</li>
                                <li><strong>Contraseña:</strong> (La que definiste al registrarte)</li>
                            </ul>
                            <p>Disfruta del mejor contenido en streaming.</p>
                            <br>
                            <p>Atentamente,<br>El equipo de Einflix</p>
                        </div>
                    `
                };

                console.log("Sending welcome email...");
                transporter.sendMail(mailOptions).catch(err => console.error("Email send async fail:", err));
                console.log("Email queued.");
            } else {
                console.log("Skipping email: EMAIL_USER or EMAIL_PASS not set in .env");
            }

        } catch (emailError) {
            console.error("Error sending email:", emailError);
        }

        return response;

    } catch (error) {
        console.error("Register Error Details:", {
            message: error.message,
            stack: error.stack
        });
        return jsonResponse(
            { success: false, message: "Error al registrar usuario: " + error.message },
            500
        );
    }
}
