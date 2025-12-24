'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/gallery');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router]);

    return (
        <div className="login-wrapper">
            <div className="login-backdrop"></div>

            <header className="header" style={{ position: 'absolute', background: 'transparent', zIndex: 10 }}>
                <h1 style={{ color: '#D4AF37', fontSize: '3rem', fontWeight: 'bold', fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}>EINFLIX</h1>
            </header>

            <div className="login-container" style={{ textAlign: 'center', padding: '60px 40px', maxWidth: '500px' }}>
                <div className="success-icon-wrapper" style={{ marginBottom: '30px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(70, 211, 105, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        border: '2px solid #46d369',
                        animation: 'pulse 2s infinite'
                    }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#46d369" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>

                <h2 style={{ fontSize: '2.5rem', marginBottom: '15px', color: 'white' }}>¡Pago Exitoso!</h2>
                <p style={{ color: '#ccc', fontSize: '1.2rem', marginBottom: '30px', lineHeight: '1.6' }}>
                    Gracias por elegir <strong>Einflix</strong>. Tu suscripción ya está activa y puedes empezar a disfrutar del mejor contenido.
                </p>

                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '30px',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                        Redirigiendo a la Galería en <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>{countdown}</span> segundos...
                    </p>
                </div>

                <Link href="/gallery" className="login-btn" style={{ textDecoration: 'none', display: 'inline-block', width: '100%' }}>
                    Ir a la Galería Ahora
                </Link>

                <style jsx>{`
                    @keyframes pulse {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(70, 211, 105, 0.4); }
                        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(70, 211, 105, 0); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(70, 211, 105, 0); }
                    }
                    .login-wrapper {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #000;
                        position: relative;
                        overflow: hidden;
                    }
                    .login-backdrop {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: radial-gradient(circle at center, rgba(229, 9, 20, 0.2) 0%, rgba(0, 0, 0, 1) 70%);
                        z-index: 1;
                    }
                    .login-container {
                        position: relative;
                        z-index: 2;
                        background: rgba(0, 0, 0, 0.75);
                        border-radius: 8px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    }
                    .login-btn {
                        background-color: #e50914;
                        color: #fff;
                        border: none;
                        padding: 15px;
                        font-size: 1rem;
                        font-weight: bold;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }
                    .login-btn:hover {
                        background-color: #f6121d;
                    }
                `}</style>
            </div>
        </div>
    );
}
