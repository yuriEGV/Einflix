import Link from 'next/link';
import { Fragment } from 'react';

export default function LandingPage() {
    return (
        <div style={{ backgroundColor: '#000', minHeight: '100vh', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 40px',
                position: 'absolute',
                top: 0,
                width: '100%',
                zIndex: 10
            }}>
                <h1 style={{ color: '#D4AF37', fontSize: '3.5rem', margin: 0, fontWeight: 'bold', fontFamily: "'Cinzel', serif", letterSpacing: '2px' }}>EINFLIX</h1>
                <div>
                    <Link href="/login" style={{
                        backgroundColor: '#D4AF37',
                        color: '#fff',
                        padding: '7px 17px',
                        textDecoration: 'none',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        fontSize: '1rem'
                    }}>
                        Iniciar Sesión
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <div style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url("https://assets.nflxext.com/ffe/siteui/vlv3/d1532433-07b1-4e39-a920-0f08b81a489e/67033404-2df2-418b-87e7-6965478d5a1d/CL-es-20231120-popsignuptwoweeks-perspective_alpha_website_large.jpg")',
                height: '70vh',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                flexDirection: 'column',
                padding: '0 20px'
            }}>
                <h1 style={{ fontSize: '3rem', maxWidth: '800px', margin: '0 0 20px' }}>
                    Películas, series, libros y más. Sin límites.
                </h1>
                <p style={{ fontSize: '1.5rem', margin: '0 0 30px' }}>
                    Disfruta donde quieras. Cancela cuando quieras.
                </p>
                <Link href="/register">
                    <button style={{
                        backgroundColor: '#D4AF37',
                        color: 'white',
                        border: 'none',
                        padding: '15px 30px',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        borderRadius: '4px'
                    }}>
                        Comenzar Ahora ➤
                    </button>
                </Link>
            </div>

            {/* Planes Section */}
            <section style={{ padding: '50px 20px', textAlign: 'center', background: '#000' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '40px' }}>Elige el plan ideal para ti</h2>

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '20px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    {/* Basic Plan */}
                    <PlanCard
                        title="Einflix Básico"
                        price="$1.000"
                        period="mes"
                        features={['Biblioteca de Libros', 'Revistas y Comics', 'Disfruta en Tablet/Phone']}
                    />

                    {/* Medium Plan */}
                    <PlanCard
                        title="Einflix Medium"
                        price="$2.500"
                        period="mes"
                        features={['Películas y Series', 'Calidad HD', 'Sin Publicidad']}
                    />

                    {/* Total Plan */}
                    <PlanCard
                        title="Einflix Total"
                        price="$3.000"
                        period="mes"
                        isFeatured={true}
                        features={['Todo el Catálogo', 'Música y Karaoke', 'Calidad 4K Ultimate', 'Descargas Offline']}
                    />
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '50px 20px', color: '#737373', fontSize: '0.9em', maxWidth: '1000px', margin: '0 auto' }}>
                <p>¿Preguntas? Llama al 800-000-000</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginTop: '20px' }}>
                    <span>Preguntas frecuentes</span>
                    <span>Centro de ayuda</span>
                    <span>Términos de uso</span>
                    <span>Privacidad</span>
                </div>
            </footer>
        </div>
    );
}

function PlanCard({ title, price, period, features, isFeatured }) {
    return (
        <div style={{
            backgroundColor: isFeatured ? '#222' : '#111',
            border: isFeatured ? '2px solid #D4AF37' : '1px solid #333',
            borderRadius: '10px',
            padding: '30px',
            flex: '1 1 300px',
            maxWidth: '350px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: isFeatured ? '0 0 15px rgba(229, 9, 20, 0.4)' : 'none'
        }}>
            {isFeatured && (
                <span style={{
                    backgroundColor: '#D4AF37',
                    color: 'white',
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '5px 15px',
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                }}>
                    MÁS POPULAR
                </span>
            )}

            <h3 style={{ fontSize: '1.8rem', margin: '10px 0' }}>{title}</h3>

            <div style={{ margin: '20px 0' }}>
                <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>{price}</span>
                <span style={{ color: '#aaa' }}> / {period}</span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '30px', flexGrow: 1 }}>
                {features.map((feat, i) => (
                    <li key={i} style={{
                        padding: '10px 0',
                        borderBottom: '1px solid #333',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: '#D4AF37', marginRight: '10px', fontSize: '1.2rem' }}>✓</span>
                        {feat}
                    </li>
                ))}
            </ul>

            <Link href="/register" style={{ textDecoration: 'none' }}>
                <button style={{
                    width: '100%',
                    padding: '15px',
                    backgroundColor: isFeatured ? '#D4AF37' : '#fff',
                    color: isFeatured ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: 'pointer'
                }}>
                    Seleccionar Plan
                </button>
            </Link>
        </div>
    )
}
