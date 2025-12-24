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

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        resetTimer();

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [pathname]);

    return children;
}
