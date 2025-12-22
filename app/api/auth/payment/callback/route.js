import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

import Payment from '@/models/Payment';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);

        const status = searchParams.get('status');
        const externalRef = searchParams.get('external_reference'); // userId|planType|duration

        if (status === 'approved' && externalRef) {
            const [userId, planType, duration] = externalRef.split('|');

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

            // Registrar pago
            await Payment.create({
                userId,
                externalReference: externalRef,
                amount: 0, // MP no devuelve monto fácil en callback sin consultar API, omitimos por ahora o ponemos 0
                planType: planType || 'basic',
                duration: duration || 'monthly',
                status: 'approved'
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
