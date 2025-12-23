'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/gallery');
                router.refresh();
            } else {
                setError(data.message || 'Credenciales incorrectas');
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
                <h1 style={{ color: '#D4AF37', fontSize: '3.5rem', fontWeight: 'bold', fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}>EINFLIX</h1>
            </header>

            <div className="login-container">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>Iniciar Sesión</h2>
                    {error && <div className="error-message">{error}</div>}

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

                    <div className="input-group">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Entrando...' : 'Iniciar Sesión'}
                    </button>

                    <div className="login-footer">
                        <div style={{ marginBottom: '15px' }}>
                            <Link href="/forgot-password" style={{ color: '#b3b3b3', textDecoration: 'none', fontSize: '0.8rem' }}>¿Olvidaste tu contraseña?</Link>
                        </div>
                        <span>¿Primera vez en Einflix? <Link href="/register" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'none' }}>Registrate ahora</Link></span>
                    </div>
                </form>
            </div>
        </div>
    );
}
