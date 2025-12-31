'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function InactivityTracker({ children }) {
    const router = useRouter();
    const pathname = usePathname();

    // Config: 1 Hour idle limit
    const IDLE_LIMIT = 60 * 60 * 1000;
    // const IDLE_LIMIT = 10 * 1000; // DEBUG: 10 seconds

    const WARNING_DURATION = 60 * 1000; // 1 Minute to answer

    const [isIdle, setIsIdle] = useState(false);
    const idleTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);

    // Function to perform logout
    const logout = async () => {
        try {
            console.log('Logging out due to inactivity or session invalidation');
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login'); // Assuming login is at /login or /register? User uses /register mostly.
            router.refresh();
        } catch (e) {
            console.error('Logout failed', e);
        }
    };

    // Start the strict logout countdown (when modal appears)
    const startLogoutTimer = () => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = setTimeout(() => {
            logout();
        }, WARNING_DURATION);
    };

    // Show the modal
    const triggerIdleWarning = () => {
        setIsIdle(true);
        startLogoutTimer();
    };

    // Reset everything (user is active)
    const resetIdleTimer = () => {
        if (isIdle) return; // If modal is open, do not auto-reset on mousemove. User MUST click button.

        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

        idleTimerRef.current = setTimeout(triggerIdleWarning, IDLE_LIMIT);
    };

    // User explicitly says "I am here"
    const handleStillWatching = () => {
        setIsIdle(false);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        resetIdleTimer(); // Restart the main timer
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
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            return;
        }

        // --- SECURITY HEARTBEAT ---
        const checkSession = async () => {
            try {
                const res = await fetch('/api/auth/session-status');
                const data = await res.json();
                if (data.active === false) {
                    console.warn(`[Heartbeat] Session invalidated (${data.reason || 'unknown'}).`);

                    // Only logout for critical security reasons or missing token
                    if (data.reason === 'session_mismatch' || data.reason === 'token_invalid' || data.reason === 'token_missing') {
                        logout();
                    }
                }
            } catch (e) {
                console.error('[Heartbeat] Check failed', e);
            }
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Init
        resetIdleTimer();
        checkSession();
        const heartbeat = setInterval(checkSession, 60000); // Check every minute

        events.forEach(event => {
            window.addEventListener(event, resetIdleTimer);
        });

        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            clearInterval(heartbeat);
            events.forEach(event => {
                window.removeEventListener(event, resetIdleTimer);
            });
        };
    }, [pathname, isIdle]); // Re-bind if isIdle changes to respect the "don't reset if idle" rule

    return (
        <>
            {children}

            {/* IDLE WARNING MODAL */}
            {isIdle && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#D4AF37' }}>¿Sigues ahí?</h2>
                    <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Tu sesión se cerrará pronto por inactividad.</p>

                    <button
                        onClick={handleStillWatching}
                        style={{
                            padding: '12px 30px',
                            fontSize: '1.2rem',
                            backgroundColor: '#e50914',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        Seguir viendo
                    </button>
                </div>
            )}
        </>
    );
}
