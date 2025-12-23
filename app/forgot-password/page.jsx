'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage(data.message);
            } else {
                setError(data.message || 'Error al procesar la solicitud');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-backdrop"></div>
            <header className="header" style={{ position: 'absolute', background: 'transparent' }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <h1 style={{ color: '#D4AF37', fontSize: '3.5rem', fontWeight: 'bold', fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}>EINFLIX</h1>
                </Link>
            </header>

            <div className="login-container">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>Recuperar Contraseña</h2>
                    <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.9rem' }}>
                        Introduce tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </p>

                    {error && <div className="error-message">{error}</div>}
                    {message && <div style={{ backgroundColor: '#46d369', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>{message}</div>}

                    <div className="input-group">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar enlace'}
                    </button>

                    <div className="login-footer">
                        <span>¿Recordaste tu contraseña? <Link href="/login" style={{ color: 'white', fontWeight: 'bold' }}>Inicia sesión</Link></span>
                    </div>
                </form>
            </div>
        </div>
    );
}
