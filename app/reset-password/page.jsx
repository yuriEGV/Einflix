'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (data.success) {
                setMessage('Tu contraseña ha sido actualizada. Serás redirigido al inicio de sesión.');
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setError(data.message || 'Error al restablecer contraseña');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="login-wrapper">
                <div className="login-container">
                    <h2 style={{ color: '#D4AF37' }}>Token Inválido</h2>
                    <p>Falta el token de recuperación en la URL.</p>
                    <Link href="/forgot-password" style={{ color: 'white', marginTop: '20px', display: 'block' }}>Solicitar nuevo enlace</Link>
                </div>
            </div>
        );
    }

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
                    <h2>Nueva Contraseña</h2>
                    <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.9rem' }}>
                        Introduce tu nueva contraseña a continuación.
                    </p>

                    {error && <div className="error-message">{error}</div>}
                    {message && <div style={{ backgroundColor: '#46d369', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>{message}</div>}

                    <div className="input-group">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            placeholder="Nueva contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="input-group">
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirmar nueva contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Guardando...' : 'Cambiar Contraseña'}
                    </button>

                    <div className="login-footer">
                        <Link href="/login" style={{ color: 'white' }}>Volver al inicio de sesión</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
