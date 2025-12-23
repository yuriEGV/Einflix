import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mercadopago from 'mercadopago';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

// Configurar SDK de Mercado Pago
// Configurar SDK de Mercado Pago
const mpAccessToken = (process.env.MP_ACCESS_TOKEN || '').trim();
console.log("MP Init Token:", mpAccessToken ? `${mpAccessToken.substring(0, 10)}... (Length: ${mpAccessToken.length})` : "MISSING");
mercadopago.configure({
    access_token: mpAccessToken
});

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

        // Obtener usuario desde la cookie
        const token = req.cookies.get('session_token')?.value;
        if (!token) return jsonResponse({ error: 'No autorizado' }, 401);

        const secret = new TextEncoder().encode(SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);
        const userId = payload.id;

        const { amount, title, planType, duration } = await req.json();

        // Encode details in external_reference: userId|planType|duration
        const externalRef = `${userId}|${planType || 'basic'}|${duration || 'monthly'}`;

        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        const baseUrl = `${protocol}://${host}`;

        console.log("Generating payment for Base URL:", baseUrl);

        // Crear la preferencia de Mercado Pago
        const preference = {
            items: [
                {
                    title: title || 'Suscripción Einflix',
                    unit_price: Number(amount) || 5000,
                    quantity: 1,
                    currency_id: 'CLP'
                }
            ],
            back_urls: {
                success: `${baseUrl}/api/auth/payment/callback`,
                failure: `${baseUrl}/api/auth/payment/callback`,
                pending: `${baseUrl}/api/auth/payment/callback`
            },
            auto_return: 'approved',
            external_reference: externalRef,
        };

        // Solo agregar notification_url si NO es localhost (MP lo rechaza)
        if (!host.includes('localhost') || process.env.NEXT_PUBLIC_APP_URL) {
            preference.notification_url = `${process.env.NEXT_PUBLIC_APP_URL || baseUrl}/api/auth/payment/webhook`;
            console.log("Setting notification_url:", preference.notification_url);
        }

        console.log("Preference back_urls.success:", preference.back_urls.success);

        const response = await mercadopago.preferences.create(preference);

        return jsonResponse({
            id: response.body.id,
            init_point: response.body.sandbox_init_point || response.body.init_point
        });
    } catch (error) {
        console.error('Error Mercado Pago:', error);
        return jsonResponse({ error: 'Error al iniciar pago: ' + error.message }, 500);
    }
}
