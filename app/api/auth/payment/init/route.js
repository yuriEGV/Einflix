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

        // Detectar URL base para los retornos
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        // Priorizar NEXT_PUBLIC_APP_URL para que Mercado Pago vea una URL válida
        const publicUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        const callbackUrl = `${publicUrl}/api/auth/payment/callback`;

        console.log("Generating payment. Public Callback URL:", callbackUrl);

        // Configurar SDK dentro del request para asegurar frescura (v1 syntax)
        mercadopago.configurations.setAccessToken(mpAccessToken);

        // Crear la preferencia de Mercado Pago
        const preference = {
            items: [
                {
                    title: title || 'Suscripción Einflix',
                    unit_price: Math.floor(Number(amount)) || 5000,
                    quantity: 1,
                    currency_id: 'CLP'
                }
            ],
            back_urls: {
                success: callbackUrl,
                failure: callbackUrl,
                pending: callbackUrl
            },
            // IMPORTANTE: Mercado Pago suele rechazar 'auto_return' si la URL es 'localhost'
            auto_return: host.includes('localhost') && !process.env.NEXT_PUBLIC_APP_URL ? undefined : 'approved',
            external_reference: String(externalRef)
        };

        console.log("Sending Preference Payload:", JSON.stringify(preference, null, 2));

        const response = await mercadopago.preferences.create(preference);

        console.log("MP Response Status:", response.status);

        if (response.body) {
            console.log("MP Body ID:", response.body.id);
            console.log("MP Init Point:", response.body.init_point);
        }

        const resData = {
            id: response.body?.id,
            init_point: response.body?.sandbox_init_point || response.body?.init_point
        };

        // Restaurar notification_url para webhooks (MP lo permite si es HTTPS o NEXT_PUBLIC_VAL)
        if (!host.includes('localhost') || process.env.NEXT_PUBLIC_APP_URL) {
            preference.notification_url = `${process.env.NEXT_PUBLIC_APP_URL || publicUrl}/api/auth/payment/webhook`;
            console.log("Webhook enabled:", preference.notification_url);
        }

        console.log("API sending back:", JSON.stringify(resData));

        return jsonResponse(resData);
    } catch (error) {
        console.error('Error FATAL en init:', error);
        return jsonResponse({ error: 'Error al iniciar pago: ' + error.message, stack: error.stack }, 500);
    }
}
