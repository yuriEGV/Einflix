'use client'

import { useState, useEffect } from 'react'

export default function MediaModal({ item, onClose }) {
    // Local state for folder navigation inside the modal
    const [activeItem, setActiveItem] = useState(item)
    // History stack for folder navigation
    const [history, setHistory] = useState([])
    const [folderContent, setFolderContent] = useState([])
    const [folderLoading, setFolderLoading] = useState(false)

    const [playbackError, setPlaybackError] = useState(null)

    const openFolder = async (folder) => {
        setFolderLoading(true)
        setPlaybackError(null)
        try {
            const res = await fetch(`/api/drive/list?id=${folder.id}&t=${Date.now()}`)
            const data = await res.json()

            if (data.error) {
                console.error("Folder API Error:", data.error);
                setFolderContent([])
                // Don't change type to fallback if it hides the explorer
                setActiveItem(folder)
            } else {
                setFolderContent(data)
                if (activeItem.id !== folder.id) {
                    setHistory(prev => [...prev, activeItem])
                }
                setActiveItem(folder)
            }
        } catch (e) {
            console.error("Error loading folder:", e)
            setActiveItem(folder)
        } finally {
            setFolderLoading(false)
        }
    }

    useEffect(() => {
        setPlaybackError(null)
        if (item.type === 'folder') {
            openFolder(item)
        }
    }, []) // Only once on mount

    const handleItemClick = (it) => {
        setPlaybackError(null)
        if (it.type === 'folder') {
            openFolder(it)
        } else {
            setActiveItem(it)
        }
    }

    const handleVideoError = async (e) => {
        console.error("Video Playback Error:", e);
        // Try to check why it failed by pinging the API
        try {
            const res = await fetch(`/api/stream/${activeItem.id}`, { method: 'HEAD' });
            if (res.status === 403) {
                setPlaybackError("Límite de cuota de Google Drive excedido para este archivo. Intenta de nuevo en 24 horas o usa otro enlace.");
            } else {
                setPlaybackError("Error al cargar el video. Es posible que el archivo no sea compatible o el servidor esté saturado.");
            }
        } catch (err) {
            setPlaybackError("Error de conexión con el servidor de streaming.");
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

    // Fix: Use standard useEffect for video behavior
    const videoRef = useState(null);

    useEffect(() => {
        const videoElement = document.querySelector('.native-player');
        if (videoElement) {
            // Force attributes directly
            videoElement.muted = false;
            videoElement.volume = 1.0;
            videoElement.removeAttribute('muted');

            // Attempt to play if expected, but without muting
            // videoElement.play().catch(e => console.log("Autoplay blocked, waiting for user"));
        }
    });

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

                <div className={`video-container ${(activeItem.type === 'folder' || activeItem.type === 'folder_fallback') ? 'folder-mode' : ''}`} style={{
                    flex: 1,
                    backgroundColor: 'black',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>

                    {activeItem.type === 'folder' ? (
                        <div className="native-explorer" style={{ padding: '20px', height: '100%', width: '100%', overflowY: 'auto' }}>
                            {/* ... existing code ... */}
                            <div className="explorer-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                                {history.length > 0 ? (
                                    <button className="back-btn" onClick={goBack} style={{
                                        background: '#333', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                                    }}>← Volver</button>
                                ) : (
                                    <span style={{ color: 'var(--netflix-red)', fontWeight: 'bold' }}>COLECCIÓN PRIVADA</span>
                                )}
                                <span className="current-path" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {activeItem.title}
                                </span>
                            </div>

                            {folderLoading ? (
                                <div className="loading-spinner" style={{ color: 'var(--netflix-red)', fontSize: '1.5rem', textAlign: 'center', paddingTop: '50px' }}>Cargando contenido seguro...</div>
                            ) : (
                                <div className="explorer-grid" style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px'
                                }}>
                                    {folderContent.length > 0 ? folderContent.map(file => (
                                        <div key={file.id} className="explorer-card" onClick={() => handleItemClick(file)} style={{
                                            cursor: 'pointer', transition: 'transform 0.2s', backgroundColor: '#1f1f1f', borderRadius: '4px', overflow: 'hidden'
                                        }}>
                                            <div className="explorer-thumb" style={{ height: '100px', width: '100%', position: 'relative' }}>
                                                <img src={file.thumbnail} alt={file.title} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                {file.type === 'folder' && <span className="folder-icon" style={{ position: 'absolute', bottom: '5px', right: '5px', fontSize: '1.5rem' }}>📁</span>}
                                            </div>
                                            <div className="explorer-title" style={{ padding: '8px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.title}</div>
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#999', gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📂</div>
                                            <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Esta carpeta está vacía o no se pudo acceder</div>
                                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                                Verifica que la carpeta tenga contenido o que los permisos de Drive sean correctos.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : activeItem.type === 'pdf' ? (
                        <div style={{ width: '100%', height: '100%', backgroundColor: '#202020', display: 'flex', flexDirection: 'column' }}>
                            <iframe
                                src={`/api/stream/${activeItem.id}#toolbar=0&navpanes=0&scrollbar=0`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title={activeItem.title}
                            />
                        </div>
                    ) : activeItem.type === 'audio' ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px' }}>
                            <div className="audio-art" style={{ width: '200px', height: '200px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(255,0,0,0.3)' }}>
                                <img src={activeItem.thumbnail} alt={activeItem.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <h3 style={{ margin: 0 }}>{activeItem.title}</h3>
                            <audio
                                key={activeItem.id}
                                controls
                                autoPlay
                                src={`/api/stream/${activeItem.id}`}
                                style={{ width: '80%', maxWidth: '600px' }}
                            />
                        </div>
                    ) : (activeItem.title.toLowerCase().endsWith('.cbr') || activeItem.title.toLowerCase().endsWith('.cbz') || activeItem.mimeType === 'application/x-cbr') ? (
                        <div style={{ width: '100%', height: '100%', backgroundColor: '#202020', display: 'flex', flexDirection: 'column' }}>
                            <iframe
                                src={`https://drive.google.com/file/d/${activeItem.id}/preview`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title={activeItem.title}
                                allow="autoplay"
                            />
                        </div>
                    ) : (
                        // VIDEO PLAYER (ALWAYS PROXIED)
                        <div style={{ width: '100%', height: '100%', backgroundColor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <video
                                key={activeItem.id}
                                controls
                                playsInline
                                crossOrigin="anonymous"
                                onError={handleVideoError}
                                className="native-player"
                                src={`/api/stream/${activeItem.id}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    width: 'auto',
                                    height: 'auto',
                                    display: 'block',
                                    objectFit: 'contain'
                                }}
                            >
                                Tu navegador no soporta el elemento de video o el formato es incompatible.
                            </video>

                            {playbackError && (
                                <div className="error-overlay" style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', color: 'white', padding: '40px',
                                    textAlign: 'center', zIndex: 5
                                }}>
                                    <span style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</span>
                                    <h3 style={{ color: 'var(--netflix-red)', marginBottom: '15px' }}>LÍMITE DE CUOTA EXCEDIDO</h3>
                                    <p style={{ fontSize: '1.1rem', maxWidth: '500px', lineHeight: '1.4' }}>
                                        {playbackError}
                                    </p>
                                    <button onClick={() => setPlaybackError(null)} style={{
                                        marginTop: '20px', padding: '10px 20px', backgroundColor: 'white',
                                        color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                                    }}>Cerrar</button>
                                </div>
                            )}
                        </div>
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
