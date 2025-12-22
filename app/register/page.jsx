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
                // Redirigir al login o login automatico (Future improvement)
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

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                position: 'relative',
                zIndex: 1,
                padding: '20px',
                gap: '40px',
                flexWrap: 'wrap'
            }}>
                {/* Info Panel */}
                <div style={{
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    padding: '40px',
                    borderRadius: '8px',
                    maxWidth: '500px',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Unete a Einflix</h2>
                    <p style={{ fontSize: '1.2rem', marginBottom: '30px', lineHeight: '1.5' }}>
                        Crea tu cuenta para acceder a nuestros planes exclusivos. Elige el que mejor se adapte a ti despues de registrarte.
                    </p>

                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>Nuestros Planes:</h3>
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
                            <li style={{ marginBottom: '15px' }}>
                                <strong style={{ color: '#E50914' }}>Básico ($1.000)</strong>
                                <span style={{ display: 'block', color: '#ccc', fontSize: '0.9rem' }}>Acceso a libros y revistas.</span>
                            </li>
                            <li style={{ marginBottom: '15px' }}>
                                <strong style={{ color: '#E50914' }}>Medium ($2.500)</strong>
                                <span style={{ display: 'block', color: '#ccc', fontSize: '0.9rem' }}>Películas y Series HD.</span>
                            </li>
                            <li>
                                <strong style={{ color: '#E50914' }}>Total ($3.000)</strong>
                                <span style={{ display: 'block', color: '#ccc', fontSize: '0.9rem' }}>Todo incluido + 4K.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Form Panel */}
                <div className="login-container" style={{ margin: 0 }}>
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
                            {loading ? 'Creando cuenta...' : 'Continuar al Pago'}
                        </button>

                        <div className="login-footer">
                            <span>¿Ya tienes cuenta? <Link href="/login" style={{ color: 'white', fontWeight: 'bold' }}>Inicia sesión</Link></span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
