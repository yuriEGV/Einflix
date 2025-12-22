'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handlePayment = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/payment/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 5000 }), // Precio ejemplo
            });

            const data = await res.json();

            if (data.init_point) {
                // Mercado Pago redirección directa al Checkout Pro
                window.location.href = data.init_point;
            } else {
                setError('No se pudo iniciar el pago. Revisa la consola.');
            }
        } catch (err) {
            setError('Error al conectar con la pasarela de pago');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-backdrop"></div>
            <header className="header" style={{ position: 'absolute', background: 'transparent' }}>
                <h1 style={{ color: '#e50914', fontSize: '2.5rem', fontWeight: 'bold' }}>EINFLIX</h1>
            </header>

            <div className="login-container" style={{ textAlign: 'center' }}>
                <div className="login-form">
                    <h2 style={{ marginBottom: '10px' }}>Acceso Suspendido</h2>
                    <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '1.1rem' }}>
                        Para disfrutar del contenido exclusivo de Einflix, necesitas activar tu suscripción Premium.
                    </p>

                    <div style={{ backgroundColor: '#333', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>Plan Mensual</h3>
                        <p style={{ color: '#e50914', fontSize: '2rem', fontWeight: 'bold' }}>$5.000 CLP</p>
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '15px', color: '#aaa', fontSize: '0.9rem', textAlign: 'left' }}>
                            <li>✅ Acceso a 48 Colecciones</li>
                            <li>✅ Calidad 4K/UHD</li>
                            <li>✅ Sin publicidad</li>
                        </ul>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button
                        onClick={handlePayment}
                        className="login-btn"
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                    >
                        {loading ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
                        {!loading && <img src="https://http2.mlstatic.com/frontend-assets/sdk/mercadopago-lib/1.1.0/mercadopago/logo-main.svg" alt="MP" style={{ height: '20px' }} />}
                    </button>

                    <div className="login-footer" style={{ marginTop: '20px' }}>
                        <Link href="/login" style={{ color: '#737373', textDecoration: 'none' }}>Volver al inicio</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
