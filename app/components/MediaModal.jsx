'use client'

import { useState } from 'react'

export default function MediaModal({ item, onClose }) {
    // Local state for folder navigation inside the modal
    const [activeItem, setActiveItem] = useState(item)
    // History stack for folder navigation
    const [history, setHistory] = useState([])
    const [folderContent, setFolderContent] = useState([])
    const [folderLoading, setFolderLoading] = useState(false)

    // Initial load check if it's a folder? 
    // Actually, the parent passes the 'item'. 
    // If 'item' is a folder, we might want to load it immediately.
    // However, existing logic in GalleryPage had 'active' state and 'openFolder' function.
    // To make this reusable, we should probably handle the loading HERE if we click on folders.
    // OR we pass 'openFolder' logic. 
    // BETTER: Encapsulate folder logic here.

    const openFolder = async (folder) => {
        setFolderLoading(true)
        try {
            const res = await fetch(`/api/drive/list?id=${folder.id}`)
            const data = await res.json()

            if (data.error) {
                if (data.error === 'config_missing') {
                    // Fallback using iframe
                    console.warn("Using Iframe fallback due to missing API Key");
                    setFolderContent([])
                    setActiveItem({ ...folder, type: 'folder_fallback' })
                } else {
                    throw new Error(data.error)
                }
            } else {
                setFolderContent(data)
                // Add current folder to history before switching
                // Wait, if we are opening a subfolder, we push the PARENT to history.
                // If we are just starting, history is empty.
                if (activeItem.id !== folder.id) {
                    setHistory(prev => [...prev, activeItem])
                }
                setActiveItem(folder)
            }
        } catch (e) {
            console.error("Error loading folder:", e)
            setActiveItem({ ...folder, type: 'folder_fallback' })
        } finally {
            setFolderLoading(false)
        }
    }

    // Effect to load initial folder if the passed item is a folder and not already loaded content
    // But 'item' prop changes? No, 'item' is the initial open.
    // If passed item is a folder, we should trigger load.

    // We need a use effect or just check on render?
    // Let's use a "init" effect.
    useState(() => {
        if (item.type === 'folder') {
            openFolder(item)
        }
    })

    const handleItemClick = (it) => {
        if (it.type === 'folder') {
            openFolder(it)
        } else {
            setActiveItem(it)
        }
    }

    const goBack = () => {
        if (history.length === 0) {
            // If no history, maybe close modal? Or go back to root?
            // If we are at root folder, we can't go back further.
            return;
        }
        const prev = history[history.length - 1]
        setHistory(prevHist => prevHist.slice(0, -1))

        // If prev was a folder, reload it?
        // Optimally we'd cache it, but re-fetching is safer/easier.
        if (prev.type === 'folder') {
            openFolder(prev)
        } else {
            setActiveItem(prev)
        }
    }

    return (
        <div className="modal" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex',
            justifyContent: 'center', alignItems: 'center'
        }}>
            <div className="inner" onClick={(e) => e.stopPropagation()} style={{
                position: 'relative', width: '90%', maxWidth: '1200px', height: '85%',
                backgroundColor: '#141414', borderRadius: '8px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column'
            }}>
                <button className="close-btn" onClick={onClose} style={{
                    position: 'absolute', top: '15px', right: '20px', zIndex: 10,
                    background: 'transparent', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer'
                }}>✕</button>

                <div className={`video-container ${(activeItem.type === 'folder' || activeItem.type === 'folder_fallback') ? 'folder-mode' : ''}`} style={{ flex: 1, backgroundColor: 'black', position: 'relative' }}>

                    {activeItem.type === 'folder' ? (
                        <div className="native-explorer" style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
                            <div className="explorer-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                {history.length > 0 && (
                                    <button className="back-btn" onClick={goBack} style={{
                                        background: '#333', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                                    }}>← Volver</button>
                                )}
                                <span className="current-path" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {[item, ...history].find(x => x.id === activeItem.id)?.title || activeItem.title}
                                </span>
                            </div>

                            {folderLoading ? (
                                <div className="loading-spinner" style={{ color: 'var(--netflix-red)', fontSize: '1.5rem', textAlign: 'center', paddingTop: '50px' }}>Cargando contenido...</div>
                            ) : (
                                <div className="explorer-grid" style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px'
                                }}>
                                    {folderContent.map(file => (
                                        <div key={file.id} className="explorer-card" onClick={() => handleItemClick(file)} style={{
                                            cursor: 'pointer', transition: 'transform 0.2s', backgroundColor: '#1f1f1f', borderRadius: '4px', overflow: 'hidden'
                                        }}>
                                            <div className="explorer-thumb" style={{ height: '100px', width: '100%', position: 'relative' }}>
                                                <img src={file.thumbnail} alt={file.title} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                {file.type === 'folder' && <span className="folder-icon" style={{ position: 'absolute', bottom: '5px', right: '5px', fontSize: '1.5rem' }}>📁</span>}
                                            </div>
                                            <div className="explorer-title" style={{ padding: '8px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.title}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        // VIDEO / IFRAME PLAYER
                        activeItem.contentType === 'mp4' ? (
                            <video
                                controls
                                autoPlay
                                className="native-player"
                                src={`/api/stream/${activeItem.id}`}
                                style={{ width: '100%', height: '100%' }}
                            >
                                Tu navegador no soporta el elemento de video.
                            </video>
                        ) : (
                            <iframe
                                src={activeItem.type === 'folder_fallback'
                                    ? `https://drive.google.com/embeddedfolderview?id=${activeItem.id}#grid`
                                    : activeItem.preview}
                                title={activeItem.title}
                                allow="autoplay; fullscreen"
                                allowFullScreen
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-storage-access-by-user-activation"
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        )
                    )}
                </div>

                <div className="modal-content" style={{ padding: '20px', backgroundColor: '#141414' }}>
                    <h2 className="modal-title" style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{activeItem.title}</h2>
                    <div className="modal-meta" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', color: '#a3a3a3' }}>
                        <span style={{ color: '#46d369', fontWeight: 700 }}>98% de coincidencia</span>
                        <span>2024</span>
                        <span style={{ border: '1px solid #777', padding: '0 4px', fontSize: '0.8rem' }}>
                            {activeItem.type === 'folder' ? 'COLECCIÓN' : 'HD'}
                        </span>
                    </div>
                    <p style={{ lineHeight: 1.5, fontSize: '1.1rem', color: '#fff' }}>
                        {activeItem.description || (activeItem.type === 'folder'
                            ? 'Explora el contenido de esta colección directamente desde Einflix.'
                            : 'Disfruta de la mejor calidad de reproducción.')}
                    </p>
                </div>
            </div>
        </div>
    )
}
