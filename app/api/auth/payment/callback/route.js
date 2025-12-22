import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);

        const status = searchParams.get('status');
        const userId = searchParams.get('external_reference');

        if (status === 'approved' && userId) {
            await User.findByIdAndUpdate(userId, {
                isPaid: true,
                subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
