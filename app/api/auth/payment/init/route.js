import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import axios from 'axios';
import { jwtVerify } from 'jose';

const WEBPAY_API_URL = process.env.WEBPAY_API_URL || 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.3';
const WEBPAY_API_KEY_ID = process.env.WEBPAY_API_KEY_ID || 'tu-tbk-id-aqui';
const WEBPAY_API_KEY_SECRET = process.env.WEBPAY_API_KEY_SECRET || 'tu-clave-secreta-aqui';
const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

function webpayHeaders() {
    return {
        'Tbk-Api-Key-Id': WEBPAY_API_KEY_ID,
        'Tbk-Api-Key-Secret': WEBPAY_API_KEY_SECRET,
        'Content-Type': 'application/json',
    };
}

export async function POST(req) {
    try {
        await dbConnect();

        // Obtener usuario desde la cookie
        const token = req.cookies.get('session_token')?.value;
        if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const secret = new TextEncoder().encode(SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);
        const userId = payload.id;

        const { amount } = await req.json();

        const buy_order = `order-${Date.now()}`;
        const session_id = `session-${userId}`;
        const return_url = `${new URL(req.url).origin}/api/auth/payment/callback`;

        const transbankPayload = {
            buy_order,
            session_id,
            amount: amount || 5000,
            return_url,
        };

        const resp = await axios.post(
            `${WEBPAY_API_URL}/transactions`,
            transbankPayload,
            { headers: webpayHeaders() }
        );

        return NextResponse.json(resp.data);
    } catch (error) {
        console.error('Error Webpay:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Error al iniciar pago' }, { status: 500 });
    }
}
