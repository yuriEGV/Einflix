import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import axios from 'axios';

const WEBPAY_API_URL = process.env.WEBPAY_API_URL || 'https://webpay3gint.transbank.cl/rswebpaytransaction/api/webpay/v1.3';
const WEBPAY_API_KEY_ID = process.env.WEBPAY_API_KEY_ID || 'tu-tbk-id-aqui';
const WEBPAY_API_KEY_SECRET = process.env.WEBPAY_API_KEY_SECRET || 'tu-clave-secreta-aqui';

function webpayHeaders() {
    return {
        'Tbk-Api-Key-Id': WEBPAY_API_KEY_ID,
        'Tbk-Api-Key-Secret': WEBPAY_API_KEY_SECRET,
        'Content-Type': 'application/json',
    };
}

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const token_ws = searchParams.get('token_ws');

        if (!token_ws) {
            return NextResponse.redirect(new URL('/payment?status=error', req.url));
        }

        // Confirmar transacción
        const confirmUrl = `${WEBPAY_API_URL}/transactions/${token_ws}`;
        const resp = await axios.put(confirmUrl, {}, { headers: webpayHeaders() });

        if (resp.data.status === 'AUTHORIZED') {
            const sessionId = resp.data.session_id;
            const userId = sessionId.split('session-')[1];

            await User.findByIdAndUpdate(userId, {
                isPaid: true,
                subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días ej.
            });

            return NextResponse.redirect(new URL('/gallery?payment=success', req.url));
        } else {
            return NextResponse.redirect(new URL('/payment?status=failed', req.url));
        }
    } catch (error) {
        console.error('Error Callback:', error.response?.data || error.message);
        return NextResponse.redirect(new URL('/payment?status=error', req.url));
    }
}

// POST para cuando transbank lo envía vía form
export async function POST(req) {
    return GET(req);
}
