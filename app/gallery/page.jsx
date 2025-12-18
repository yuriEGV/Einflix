'use client'

import { useEffect, useState } from 'react'

export default function GalleryPage() {
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
        if (it.type === 'folder') {
            window.open(it.original, '_blank')
        } else {
            setActive(it)
        }
    }

    return (
        <main>
            <header className={`header ${scrolled ? 'scrolled' : ''}`}>
                <h1>EINFLIX</h1>
            </header>

            {/* Hero Section */}
            {!loading && featuredItem && (
                <div className="hero">
                    <img
                        src={featuredItem.thumbnail.replace('sz=w600', 'sz=w1200')}
                        alt="Featured"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div className="hero-content">
                        <h2 className="hero-title">{featuredItem.title}</h2>
                        <p className="hero-desc">Descubre contenido exclusivo guardado en la nube. Reproducción instantánea y calidad garantizada.</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={() => handleItemClick(featuredItem)}>
                                <span>▶</span> {featuredItem.type === 'folder' ? 'Abrir Carpeta' : 'Reproducir'}
                            </button>
                            <button className="btn btn-secondary">
                                <span>ⓘ</span> Más información
                            </button>
                        </div>
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
                                    <img src={it.thumbnail} alt={it.title} loading="lazy" />
                                    <div className="card-info">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{it.title}</span>
                                            <span className="badge">{it.type === 'folder' ? '📁' : '🎬'}</span>
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

                        <div className="video-container">
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
                                <span style={{ border: '1px solid #777', padding: '0 4px', fontSize: '0.8rem' }}>HD</span>
                            </div>
                            <p style={{ lineHeight: 1.5, fontSize: '1.1rem' }}>
                                Estás viendo "{active.title}". Este contenido se sirve directamente desde Google Drive y está optimizado para su visualización en Einflix.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
