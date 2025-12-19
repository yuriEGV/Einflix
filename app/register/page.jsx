'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [name, setName] = useState('');
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
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (data.success) {
                router.push('/login');
            } else {
                setError(data.message || 'Error al registrarse');
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
                    <h1 style={{ color: '#e50914', fontSize: '2.5rem', fontWeight: 'bold' }}>EINFLIX</h1>
                </Link>
            </header>

            <div className="login-container">
                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>Registrarse</h2>
                    {error && <div className="error-message">{error}</div>}

                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Nombre completo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <input
                            type="password"
                            placeholder="Contraseña (mín. 6 caracteres)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Creando cuenta...' : 'Registrarse'}
                    </button>

                    <div className="login-footer">
                        <span>¿Ya tienes cuenta? <Link href="/login" style={{ color: 'white', fontWeight: 'bold' }}>Inicia sesión</Link></span>
                    </div>
                </form>
            </div>
        </div>
    );
}
