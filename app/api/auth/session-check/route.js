import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const t = searchParams.get('t');

        const { id, sessionId } = await req.json();

        const user = await User.findById(id);

        if (!user) {
            console.log(`[SessionCheck] User not found: ${id}`);
            return new Response(JSON.stringify({ active: false }), { status: 200 });
        }

        const isActive = user.activeSessionId === sessionId;
        console.log(`[SessionCheck] t=${t} | Result for ${user.email}: ${isActive} (DB: ${user.activeSessionId} vs Token: ${sessionId})`);

        return new Response(JSON.stringify({
            active: isActive,
            dbSessionId: user.activeSessionId
        }), { status: 200 });
    } catch (error) {
        console.error("Session check error:", error);
        return new Response(JSON.stringify({ active: false, error: error.message }), { status: 500 });
    }
}
