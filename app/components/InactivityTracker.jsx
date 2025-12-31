'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function InactivityTracker({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const timerRef = useRef(null);
    const INACTIVITY_LIMIT = 3 * 60 * 60 * 1000; // 3 hours in ms

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (e) {
            console.error('Inactivity logout failed', e);
        }
    };

    const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, INACTIVITY_LIMIT);
    };

    useEffect(() => {
        // Only track inactivity for protected routes
        const isPublic = [
            '/login',
            '/register',
            '/forgot-password',
            '/reset-password',
            '/'
        ].includes(pathname);

        if (isPublic) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/session-status');
                const data = await res.json();
                if (data.active === false) {
                    console.warn(`[Heartbeat] Session invalidated (${data.reason || 'unknown'}), logging out...`);
                    // If no_session_id, it means cookie might be lost or format old.
                    // If session_mismatch, it means logged in elsewhere.
                    console.warn(`[Heartbeat] Session invalidated (${data.reason || 'unknown'}). Logout suppressed for debugging.`);
                    // logout(); // Temporarily disabled to prevent loops
                }
            } catch (e) {
                console.error('[Heartbeat] Check failed', e);
            }
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        resetTimer();
        checkSession(); // Check on mount
        const heartbeat = setInterval(checkSession, 60000); // Check every minute

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            clearInterval(heartbeat);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [pathname]);

    return children;
}
