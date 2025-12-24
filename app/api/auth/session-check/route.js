import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
    try {
        await dbConnect();
        const { id, sessionId } = await req.json();

        if (!id || !sessionId) {
            return new Response(JSON.stringify({ active: false, message: "Missing params" }), { status: 400 });
        }

        const user = await User.findById(id);

        if (!user || user.activeSessionId !== sessionId) {
            return new Response(JSON.stringify({ active: false }), { status: 200 });
        }

        return new Response(JSON.stringify({ active: true }), { status: 200 });
    } catch (error) {
        console.error("Session check error:", error);
        return new Response(JSON.stringify({ active: false, error: error.message }), { status: 500 });
    }
}
