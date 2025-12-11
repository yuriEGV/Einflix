'use client'

import { useEffect, useState } from 'react'

export default function GalleryPage() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [active, setActive] = useState(null)

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const res = await fetch('/api/gallery')
                const j = await res.json()
                setItems(j.items || [])
            } catch (e) {
                console.error(e)
            } finally { setLoading(false) }
        }
        load()
    }, [])

    return (
        <main className="container">
            <h1 className="header">Galería Einflix</h1>

            {loading && <p>cargando...</p>}

            <div className="grid">
                {items.map((it, idx) => (
                    <div key={idx} className="card">
                        {it.type === 'image' && (
                            <img src={it.src} alt={`item-${idx}`} onClick={() => setActive(it)} />
                        )}
                        {it.type === 'video' && (
                            <video controls src={it.src} style={{ width: '100%' }} onClick={() => setActive(it)} />
                        )}
                        {it.type === 'drive' && (
                            <iframe src={it.preview} title={`drive-${idx}`} />
                        )}

                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="badge">{it.type}</span>
                            <a href={it.original} target="_blank" rel="noreferrer" className="badge">abrir</a>
                        </div>
                    </div>
                ))}
            </div>

            {active && (
                <div className="modal" onClick={() => setActive(null)}>
                    <div className="inner" onClick={(e) => e.stopPropagation()}>
                        {active.type === 'image' && <img src={active.src} alt="active" />}
                        {active.type === 'video' && <video controls src={active.src} />}
                        {active.type === 'drive' && <iframe src={active.preview} style={{ width: '100%', height: '70vh' }} />}
                        <div style={{ marginTop: 8, textAlign: 'right' }}>
                            <button onClick={() => setActive(null)}>cerrar</button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    )
}
