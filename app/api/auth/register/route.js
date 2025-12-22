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

        // --- Enviar Correo de Bienvenida ---
        try {
            console.log("Configuring email transporter...");
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.createTransport({
                service: 'gmail', // O configura host/port si usas otro
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

            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                console.log("Sending welcome email...");
                await transporter.sendMail(mailOptions);
                console.log("Email sent successfully.");
            } else {
                console.log("Skipping email: EMAIL_USER or EMAIL_PASS not set in .env");
            }

        } catch (emailError) {
            console.error("Error sending email:", emailError);
            // No fallamos el registro si el correo falla, solo lo logueamos
        }

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
