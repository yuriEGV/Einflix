'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GalleryPage() {
    const router = useRouter()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [active, setActive] = useState(null)
    const [scrolled, setScrolled] = useState(false)

    // Folder Explorer State
    const [folderContent, setFolderContent] = useState([])
    const [folderLoading, setFolderLoading] = useState(false)
    const [history, setHistory] = useState([]) // Stack of {id, title}

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

    // Handle Folder Navigation
    const openFolder = async (folder) => {
        setFolderLoading(true)
        try {
            const res = await fetch(`/api/drive/list?id=${folder.id}`)
            const data = await res.json()

            if (data.error) {
                if (data.error === 'config_missing') {
                    // FALLBACK: If API key is missing, we use the protected Iframe
                    console.warn("Using Iframe fallback due to missing API Key");
                    setFolderContent([])
                    setActive({ ...folder, type: 'folder_fallback' })
                } else {
                    throw new Error(data.error)
                }
            } else {
                setFolderContent(data)
                setHistory(prev => [...prev, { id: folder.id, title: folder.title }])
                if (!active || active.id !== folder.id) {
                    setActive(folder)
                }
            }
        } catch (e) {
            console.error("Error loading folder:", e)
            // Error fallback
            setActive({ ...folder, type: 'folder_fallback' })
        } finally {
            setFolderLoading(false)
        }
    }

    const handleItemClick = (it) => {
        if (it.type === 'folder') {
            setHistory([]) // Reset history when starting fresh from gallery
            openFolder(it)
        } else {
            setActive(it)
        }
    }

    const goBack = () => {
        const newHistory = [...history]
        newHistory.pop() // Remove current
        if (newHistory.length === 0) {
            setHistory([])
            setFolderContent([])
            setActive(null)
        } else {
            const parent = newHistory[newHistory.length - 1]
            setHistory(newHistory.slice(0, -1)) // Temporary to avoid double add
            openFolder(parent)
        }
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

            {/* Modal Player / Explorer */}
            {active && (
                <div className="modal" onClick={() => setActive(null)}>
                    <div className="inner" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setActive(null)}>✕</button>

                        <div className={`video-container ${(active.type === 'folder' || active.type === 'folder_fallback') ? 'folder-mode' : ''}`}>
                            {active.type === 'folder' ? (
                                <div className="native-explorer">
                                    <div className="explorer-header">
                                        {history.length > 1 && (
                                            <button className="back-btn" onClick={goBack}>← Volver</button>
                                        )}
                                        <span className="current-path">{history.map(h => h.title).join(' / ')}</span>
                                    </div>
                                    <div className="explorer-grid">
                                        {folderLoading ? (
                                            <div className="loading-spinner">Cargando...</div>
                                        ) : (
                                            folderContent.map(file => (
                                                <div key={file.id} className="explorer-card" onClick={() => file.type === 'folder' ? openFolder(file) : setActive(file)}>
                                                    <div className="explorer-thumb">
                                                        <img src={file.thumbnail} alt={file.title} crossOrigin="anonymous" />
                                                        {file.type === 'folder' && <span className="folder-icon">📁</span>}
                                                    </div>
                                                    <div className="explorer-title">{file.title}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <iframe
                                    src={active.type === 'folder_fallback'
                                        ? `https://drive.google.com/embeddedfolderview?id=${active.id}#grid`
                                        : active.preview}
                                    title={active.title}
                                    allow="autoplay; fullscreen"
                                    allowFullScreen
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-storage-access-by-user-activation"
                                />
                            )}
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
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}
