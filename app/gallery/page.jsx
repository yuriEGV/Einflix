'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MediaModal from '@/app/components/MediaModal'

export default function GalleryPage() {
    const router = useRouter()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [active, setActive] = useState(null)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)

        async function load() {
            setLoading(true)
            try {
                const res = await fetch('/api/drive/catalogo')
                const data = await res.json()
                setItems(Array.isArray(data) ? data : [])
            } catch (e) {
                console.error("Error loading catalogue:", e)
            } finally {
                setLoading(false)
            }
        }
        load()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const featuredItem = items[0]

    const handleItemClick = (it) => {
        setActive(it)
    }

    const handleLogout = async () => {
        if (!window.confirm("¿Estás seguro que deseas cerrar sesión?")) {
            return;
        }
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/register');
            router.refresh();
        } catch (e) {
            console.error("Logout failed", e);
        }
    }

    return (
        <main>
            <header className={`header ${scrolled ? 'scrolled' : ''}`} style={{ zIndex: 110 }}>
                <h1 style={{ color: 'var(--netflix-red)', margin: 0 }}>EINFLIX</h1>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Search Icon */}
                    <button
                        onClick={() => router.push('/search')}
                        aria-label="Buscar"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="btn"
                        style={{
                            backgroundColor: 'var(--netflix-red)',
                            color: 'white',
                            padding: '6px 15px',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                        }}
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            {!loading && featuredItem && (
                <div className="hero">
                    <img
                        src={featuredItem.thumbnail.includes('unsplash') ? featuredItem.thumbnail.replace('w=800', 'w=1600') : featuredItem.thumbnail}
                        alt="Featured"
                        crossOrigin="anonymous"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1600&auto=format&fit=crop';
                            e.target.style.opacity = '0.5';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div className="hero-content">
                        <h2 className="hero-title">EINFLIX : COLECCION DE ENLACES</h2>
                        <p className="hero-desc">DESCUBRE CONTENIDO EXCLUSIVO EN LA NUBE, REPRODUCCION INSTANTANEA DE CALIDAD.</p>
                    </div>
                </div>
            )}

            <div className="container" style={{ position: 'relative', marginTop: loading ? '100px' : '-50px' }}>
                <section className="grid-section">
                    <h3 className="grid-title">Mi Lista</h3>
                    <div className="grid">
                        {loading ? (
                            Array(12).fill(0).map((_, i) => (
                                <div key={i} className="card" style={{ opacity: 0.3 }} />
                            ))
                        ) : (
                            items.map((it) => (
                                <div key={it.id} className="card" onClick={() => handleItemClick(it)}>
                                    <img
                                        src={it.thumbnail}
                                        alt={it.title}
                                        loading="lazy"
                                        crossOrigin="anonymous"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400&auto=format&fit=crop';
                                            e.target.style.filter = 'grayscale(100%) brightness(50%)';
                                        }}
                                    />
                                    <div className="card-info">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className="badge" style={{ alignSelf: 'flex-start', marginBottom: '4px' }}>{it.category}</span>
                                            <span style={{ fontSize: '1rem', fontWeight: 600, lineHeight: '1.2' }}>{it.title}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>
                                                {it.type === 'folder' ? '📁 Ver Carpeta' : '🎬 Reproducir'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* Reusable Modal */}
            {active && (
                <MediaModal
                    item={active}
                    onClose={() => setActive(null)}
                />
            )}
        </main>
    )
}
