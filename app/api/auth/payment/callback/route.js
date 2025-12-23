import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

import Payment from '@/models/Payment';

export const dynamic = 'force-dynamic';

import mercadopago from 'mercadopago';

// Configurar SDK de Mercado Pago
// Configurar SDK de Mercado Pago
mercadopago.configure({
    access_token: (process.env.MP_ACCESS_TOKEN || '').trim()
});

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);

        const status = searchParams.get('status');
        const externalRef = searchParams.get('external_reference'); // userId|planType|duration
        const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');

        if ((status === 'approved' || status === 'success') && externalRef) {
            const [userId, planType, duration] = externalRef.split('|');

            // Fetch payment details from Mercado Pago
            let paidAmount = 0;
            let paymentMethod = 'unknown';

            if (paymentId) {
                try {
                    const mpRes = await mercadopago.payment.findById(Number(paymentId));
                    if (mpRes && mpRes.body) {
                        paidAmount = mpRes.body.transaction_amount;
                        paymentMethod = mpRes.body.payment_method_id;
                    }
                } catch (mpError) {
                    console.error("Error fetching MP payment:", mpError);
                }
            }

            // Calcular expiración
            let expiryDate = new Date();
            if (duration === 'yearly') {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            } else {
                expiryDate.setMonth(expiryDate.getMonth() + 1);
            }

            // Actualizar usuario
            await User.findByIdAndUpdate(userId, {
                isPaid: true,
                planType: planType || 'basic',
                subscriptionExpiry: expiryDate
            });

            // Registrar pago con datos reales
            await Payment.create({
                userId,
                externalReference: externalRef,
                paymentId: paymentId || `manual_${Date.now()}`,
                amount: paidAmount,
                paymentMethod: paymentMethod,
                planType: planType || 'basic',
                duration: duration || 'monthly',
                status: status
            });

            return Response.redirect(new URL('/gallery?payment=success', req.url));
        } else {
            return Response.redirect(new URL('/payment?status=failed', req.url));
        }
    } catch (error) {
        console.error('Error Callback:', error.message);
        return Response.redirect(new URL('/payment?status=error', req.url));
    }
}

export async function POST(req) {
    return GET(req);
}
