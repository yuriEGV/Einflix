import { NextResponse } from 'next/server';

export async function POST() {
    // Eliminar la cookie de sesión estableciendo una fecha pasada
    return new Response(JSON.stringify({
        success: true,
        message: "Sesión cerrada correctamente"
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`
        }
    });
}
