'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [planType, setPlanType] = useState('basic');
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
                body: JSON.stringify({ name, email, password, planType }),
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
        <div style={{
            minHeight: '100vh',
            position: 'relative',
            backgroundImage: "url('https://images.unsplash.com/photo-1542204172-3f2fea459039?q=80&w=2070&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Dark Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(0deg, #141414 0%, rgba(20, 20, 20, 0.8) 50%, #141414 100%)',
                zIndex: 1
            }}></div>

            {/* Header */}
            <header style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                padding: '20px 40px',
                zIndex: 10,
                background: 'transparent'
            }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <h1 style={{ color: '#e50914', fontSize: '2.5rem', margin: 0, fontWeight: 'bold' }}>EINFLIX</h1>
                </Link>
            </header>

            {/* Content Wrapper */}
            <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                zIndex: 2,
                padding: '100px 20px 40px',
                gap: '40px',
                flexWrap: 'wrap'
            }}>
                {/* PLAN INFORMATION PANEL - Explicitly visible */}
                <div style={{
                    background: 'rgba(0,0,0,0.85)',
                    padding: '40px',
                    borderRadius: '8px',
                    maxWidth: '500px',
                    width: '100%',
                    color: 'white',
                    border: '1px solid #333',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px', fontWeight: 'bold', color: '#fff' }}>Elige tu experiencia</h2>
                    <p style={{ fontSize: '1.1rem', marginBottom: '30px', lineHeight: '1.6', color: '#ccc' }}>
                        Al registrarte, podrás acceder a nuestro contenido exclusivo. Una vez dentro, <strong>selecciona tu plan</strong> en la sección de pago:
                    </p>

                    <div>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <strong style={{ color: '#fff', fontSize: '1.2rem' }}>Plan Básico</strong>
                                    <span style={{ color: '#E50914', fontWeight: 'bold', fontSize: '1.2rem' }}>$1.000</span>
                                </div>
                                <span style={{ color: '#999', fontSize: '0.9rem' }}>• Acceso a Libros y Revistas.</span>
                            </li>
                            <li style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <strong style={{ color: '#fff', fontSize: '1.2rem' }}>Plan Medium</strong>
                                    <span style={{ color: '#E50914', fontWeight: 'bold', fontSize: '1.2rem' }}>$2.500</span>
                                </div>
                                <span style={{ color: '#999', fontSize: '0.9rem' }}>• Películas + Series HD.<br />• Sin publicidad.</span>
                            </li>
                            <li>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <strong style={{ color: '#fff', fontSize: '1.2rem' }}>Plan Total</strong>
                                    <span style={{ color: '#E50914', fontWeight: 'bold', fontSize: '1.2rem' }}>$3.000</span>
                                </div>
                                <span style={{ color: '#999', fontSize: '0.9rem' }}>• Todo incluido (4K).<br />• Música + Karaoke + Descargas.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* REGISTRATION FORM */}
                <div style={{
                    background: 'rgba(0,0,0,0.75)',
                    padding: '40px',
                    borderRadius: '8px',
                    maxWidth: '450px',
                    width: '100%',
                    minWidth: '300px'
                }}>
                    <form onSubmit={handleSubmit}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '28px', color: 'white', fontWeight: 'bold' }}>Crear Cuenta</h2>
                        {error && <div style={{
                            backgroundColor: '#e87c03',
                            color: 'white',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            marginBottom: '20px',
                            fontSize: '0.9rem'
                        }}>{error}</div>}

                        <div style={{ marginBottom: '16px' }}>
                            <input
                                type="text"
                                placeholder="Nombre completo"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <input
                                type="email"
                                placeholder="Correo electrónico"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <input
                                type="password"
                                placeholder="Contraseña (mín. 6 caracteres)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>Selecciona tu Plan:</label>
                            <select
                                value={planType}
                                onChange={(e) => setPlanType(e.target.value)}
                                style={{ width: '100%', padding: '16px 20px', borderRadius: '4px', border: 'none', backgroundColor: '#333', color: 'white', fontSize: '1rem', cursor: 'pointer' }}
                            >
                                <option value="basic">Plan Básico ($1.000)</option>
                                <option value="medium">Plan Medium ($2.500)</option>
                                <option value="total">Plan Total ($3.000)</option>
                            </select>
                        </div>

                        <button type="submit" disabled={loading} style={{
                            width: '100%',
                            padding: '16px',
                            backgroundColor: '#e50914',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: '700',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}>
                            {loading ? 'Procesando...' : 'Registrarse y Elegir Plan'}
                        </button>

                        <div style={{ marginTop: '20px', color: '#737373', fontSize: '0.9rem' }}>
                            <span>¿Ya tienes cuenta? <Link href="/login" style={{ color: 'white', fontWeight: 'bold', textDecoration: 'none' }}> Inicia sesión</Link></span>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
