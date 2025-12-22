import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import mercadopago from 'mercadopago';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

// Configurar SDK de Mercado Pago
mercadopago.configurations.setAccessToken(process.env.MP_ACCESS_TOKEN || 'TEST-3392348560888206-122208-144d15655c654f164624446345839444-12345678');

export async function POST(req) {
    try {
        await dbConnect();

        // Obtener usuario desde la cookie
        const token = req.cookies.get('session_token')?.value;
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const secret = new TextEncoder().encode(SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);
        const userId = payload.id;

        const { amount, title } = await req.json();

        // Crear la preferencia de Mercado Pago
        const preference = {
            items: [
                {
                    title: title || 'Suscripción Einflix',
                    unit_price: amount || 5000,
                    quantity: 1,
                }
            ],
            back_urls: {
                success: `${new URL(req.url).origin}/api/auth/payment/callback`,
                failure: `${new URL(req.url).origin}/api/auth/payment/callback`,
                pending: `${new URL(req.url).origin}/api/auth/payment/callback`
            },
            auto_return: 'approved',
            external_reference: userId,
        };

        const response = await mercadopago.preferences.create(preference);

        return NextResponse.json({
            id: response.body.id,
            init_point: response.body.init_point
        });
    } catch (error) {
        console.error('Error Mercado Pago:', error);
        return NextResponse.json({ error: 'Error al iniciar pago' }, { status: 500 });
    }
}
