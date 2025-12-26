import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'einflix_super_secret_key_2024';

export async function GET(req) {
    try {
        const token = req.cookies.get('session_token')?.value;
        if (!token) {
            return new Response(JSON.stringify({ active: false }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma': 'no-cache'
                }
            });
        }

        const secret = new TextEncoder().encode(SECRET_KEY);
        let payload;
        try {
            const verified = await jwtVerify(token, secret);
            payload = verified.payload;
        } catch (e) {
            return new Response(JSON.stringify({ active: false }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma': 'no-cache'
                }
            });
        }

        if (!payload.sessionId) {
            return new Response(JSON.stringify({ active: false, reason: 'no_session_id' }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma': 'no-cache'
                }
            });
        }

        await dbConnect();
        const user = await User.findById(payload.id);

        if (!user || user.activeSessionId !== payload.sessionId) {
            console.warn(`[SessionStatus] Invalidation detected for ${payload.email}. DB: ${user?.activeSessionId} vs Token: ${payload.sessionId}`);
            return new Response(JSON.stringify({ active: false }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    'Pragma': 'no-cache'
                }
            });
        }

        return new Response(JSON.stringify({ active: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache'
            }
        });
    } catch (error) {
        console.error("Session status check error:", error);
        return new Response(JSON.stringify({ active: false, error: error.message }), { status: 500 });
    }
}
