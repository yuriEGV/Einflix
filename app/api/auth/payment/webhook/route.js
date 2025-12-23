import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Payment from '@/models/Payment';
import mercadopago from 'mercadopago';

export const dynamic = 'force-dynamic';

// Configurar SDK de Mercado Pago
// Configurar SDK de Mercado Pago
mercadopago.configure({
    access_token: (process.env.MP_ACCESS_TOKEN || '').trim()
});

export async function POST(req) {
    try {
        const { searchParams } = new URL(req.url);
        const topic = searchParams.get('topic') || searchParams.get('type');
        const id = searchParams.get('id') || searchParams.get('data.id');

        console.log(`WEBHOOK RECEIVED: Topic: ${topic}, ID: ${id}`);

        if (topic === 'payment') {
            const paymentId = id;
            if (!paymentId) return new Response('Missing payment ID', { status: 400 });

            // Fetch payment details from Mercado Pago
            const mpRes = await mercadopago.payment.findById(Number(paymentId));
            if (!mpRes || !mpRes.body) return new Response('Payment not found', { status: 404 });

            const paymentData = mpRes.body;
            const externalRef = paymentData.external_reference;
            const status = paymentData.status;

            console.log(`WEBHOOK PAYLOAD: Status: ${status}, Ref: ${externalRef}`);

            // Solo procesamos pagos aprobados
            if (status === 'approved' && externalRef) {
                await dbConnect();

                // Idempotencia: Verificar si el pago ya existe
                const existingPayment = await Payment.findOne({ paymentId: String(paymentId) });
                if (existingPayment) {
                    console.log(`WEBHOOK: Payment ${paymentId} already processed.`);
                    return new Response('Already processed', { status: 200 });
                }

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
                    paymentId: String(paymentId),
                    amount: paymentData.transaction_amount,
                    paymentMethod: paymentData.payment_method_id,
                    planType: planType || 'basic',
                    duration: duration || 'monthly',
                    status: status
                });

                console.log(`WEBHOOK: Payment ${paymentId} processed successfully.`);
            }
        }

        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('WEBHOOK ERROR:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
