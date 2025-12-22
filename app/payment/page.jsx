'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState('monthly'); // 'monthly' | 'yearly'
    const router = useRouter();

    const plans = [
        {
            id: 'basic',
            name: 'Einflix Básico',
            desc: 'Sólo Libros',
            price: { monthly: 1000, yearly: 10000 },
            features: ['Acceso a Biblioteca', 'Sólo Texto']
        },
        {
            id: 'medium',
            name: 'Einflix Medium',
            desc: 'Películas y Series',
            price: { monthly: 2500, yearly: 25000 },
            features: ['Películas', 'Series', 'Calidad HD']
        },
        {
            id: 'total',
            name: 'Einflix Total',
            desc: 'Todo incluido',
            price: { monthly: 3000, yearly: 30000 },
            features: ['Todo el catálogo', 'Música y Karaoke', 'Calidad 4K', 'Soporte Prioritario'],
            recommended: true
        }
    ];

    const handlePayment = async (plan) => {
        setLoading(true);
        setError('');
        const amount = period === 'monthly' ? plan.price.monthly : plan.price.yearly;
        const title = `Suscripción ${plan.name} (${period === 'monthly' ? 'Mensual' : 'Anual'})`;

        try {
            const res = await fetch('/api/auth/payment/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    title,
                    planType: plan.id,
                    duration: period
                }),
            });

            const data = await res.json();

            if (data.init_point) {
                // Mercado Pago redirección directa al Checkout Pro
                window.location.href = data.init_point;
            } else {
                setError('No se pudo iniciar el pago. Revisa la consola.');
                setLoading(false);
            }
        } catch (err) {
            setError('Error al conectar con la pasarela de pago');
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-backdrop"></div>
            <header className="header" style={{ position: 'absolute', background: 'transparent', zIndex: 10 }}>
                <h1 style={{ color: '#e50914', fontSize: '2.5rem', fontWeight: 'bold' }}>EINFLIX</h1>
            </header>

            <div className="login-container" style={{ textAlign: 'center', maxWidth: '1000px', width: '95%', padding: '40px 20px' }}>
                <h2 style={{ marginBottom: '10px', fontSize: '2rem' }}>Elige tu Plan</h2>
                <p style={{ color: '#ccc', marginBottom: '30px', fontSize: '1.1rem' }}>
                    Selecciona el plan perfecto para ti.
                </p>

                {/* Toggle Periodo */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
                    <button
                        onClick={() => setPeriod('monthly')}
                        className={`btn ${period === 'monthly' ? 'btn-red' : 'btn-dark'}`}
                        style={{ padding: '10px 20px', border: period === 'monthly' ? 'none' : '1px solid #555' }}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setPeriod('yearly')}
                        className={`btn ${period === 'yearly' ? 'btn-red' : 'btn-dark'}`}
                        style={{ padding: '10px 20px', border: period === 'yearly' ? 'none' : '1px solid #555' }}
                    >
                        Anual (Ahorra ~2 meses)
                    </button>
                </div>

                <div className="plans-grid" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
                    {plans.map((plan) => (
                        <div key={plan.id} style={{
                            backgroundColor: plan.recommended ? 'rgba(229, 9, 20, 0.1)' : 'rgba(0,0,0,0.7)',
                            border: plan.recommended ? '2px solid #e50914' : '1px solid #333',
                            borderRadius: '8px',
                            padding: '30px',
                            flex: '1 1 280px',
                            maxWidth: '320px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {plan.recommended && <span style={{ color: '#e50914', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>RECOMENDADO</span>}
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{plan.name}</h3>
                            <p style={{ color: '#aaa', minHeight: '40px' }}>{plan.desc}</p>

                            <div style={{ margin: '20px 0' }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                                    ${(period === 'monthly' ? plan.price.monthly : plan.price.yearly).toLocaleString('es-CL')}
                                </span>
                                <span style={{ color: '#777' }}> / {period === 'monthly' ? 'mes' : 'año'}</span>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px', textAlign: 'left', flexGrow: 1 }}>
                                {plan.features.map((feat, i) => (
                                    <li key={i} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                                        <span style={{ color: '#e50914', marginRight: '10px' }}>✓</span> {feat}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handlePayment(plan)}
                                className="login-btn"
                                disabled={loading}
                                style={{ width: '100%', marginTop: 'auto' }}
                            >
                                {loading ? 'Cargando...' : 'Elegir Plan'}
                            </button>
                        </div>
                    ))}
                </div>

                {error && <div className="error-message" style={{ marginTop: '20px' }}>{error}</div>}

                <div className="login-footer" style={{ marginTop: '40px' }}>
                    <Link href="/login" style={{ color: '#737373', textDecoration: 'none' }}>Volver al inicio</Link>
                </div>
            </div>
        </div>
    );
}
