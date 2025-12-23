'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
                // Fetch from the new catalogo endpoint
                const res = await fetch('/api/drive/catalogo')
                const text = await res.text()
                try {
                    const data = JSON.parse(text)
                    setItems(Array.isArray(data) ? data : [])
                } catch (parseError) {
                    console.error("JSON Parse Error. Raw response:", text)
                    throw new Error("Invalid JSON response from server")
                }
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
                <button
                    onClick={handleLogout}
                    className="btn"
                    style={{
                        backgroundColor: 'var(--netflix-red)',
                        color: 'white',
                        padding: '6px 15px',
                        fontSize: '0.9rem',
                        marginLeft: 'auto',
                        cursor: 'pointer',
                        zIndex: 120
                    }}
                >
                    Cerrar Sesión
                </button>
            </header>

            {/* Hero Section */}
            {!loading && featuredItem && (
                <div className="hero">
                    <img
                        src={featuredItem.thumbnail.includes('unsplash') ? featuredItem.thumbnail.replace('w=800', 'w=1600') : featuredItem.thumbnail}
                        alt="Featured"
                        crossOrigin="anonymous"
                        onError={(e) => {
                            e.target.onerror = null; // Prevenir loop infinito
                            e.target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=1600&auto=format&fit=crop';
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
                                            e.target.onerror = null; // Prevenir loop infinito
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

            {/* Modal Player */}
            {active && (
                <div className="modal" onClick={() => setActive(null)}>
                    <div className="inner" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setActive(null)}>✕</button>

                        <div className={`video-container ${active.type === 'folder' ? 'folder-mode' : ''}`}>
                            <iframe
                                src={active.preview}
                                title={active.title}
                                allow="autoplay; fullscreen"
                                allowFullScreen
                            />
                        </div>

                        <div className="modal-content">
                            <h2 className="modal-title">{active.title}</h2>
                            <div className="modal-meta">
                                <span style={{ color: '#46d369', fontWeight: 700 }}>98% de coincidencia</span>
                                <span>2024</span>
                                <span style={{ border: '1px solid #777', padding: '0 4px', fontSize: '0.8rem' }}>
                                    {active.type === 'folder' ? 'COLECCIÓN' : 'HD'}
                                </span>
                            </div>
                            <p style={{ lineHeight: 1.5, fontSize: '1.1rem' }}>
                                {active.description || (active.type === 'folder'
                                    ? 'Explora el contenido de esta colección directamente desde Einflix.'
                                    : 'Disfruta de la mejor calidad de reproducción.')}
                            </p>
                            {active.type === 'folder' && (
                                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <p style={{ fontSize: '0.9rem', color: '#aaa', margin: 0 }}>
                                        <span style={{ color: 'var(--netflix-red)' }}>TIP:</span> Navega por los archivos arriba y haz clic para verlos.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
