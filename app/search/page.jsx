'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MediaModal from '@/app/components/MediaModal';

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(null);

    // Debounce search
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.trim()) {
                setLoading(true);
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    setResults(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    return (
        <main className="search-page" style={{ minHeight: '100vh', backgroundColor: '#141414', color: 'white', paddingTop: '80px' }}>
            <header className="header" style={{
                position: 'fixed', top: 0, width: '100%', padding: '20px 40px',
                display: 'flex', alignItems: 'center', zIndex: 100,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 10%, rgba(0,0,0,0))'
            }}>
                <button
                    onClick={() => router.push('/gallery')}
                    style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', marginRight: '20px' }}
                >
                    ← Volver
                </button>
                <div style={{ flex: 1 }}>
                    <input
                        type="text"
                        placeholder="Títulos, personas, géneros"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                        style={{
                            width: '100%', maxWidth: '600px', padding: '15px 20px',
                            fontSize: '1.5rem', backgroundColor: '#333', border: '1px solid #555',
                            color: 'white', borderRadius: '4px', outline: 'none'
                        }}
                    />
                </div>
            </header>

            <div className="container" style={{ padding: '40px' }}>
                {loading && <div style={{ color: '#666', fontSize: '1.2rem', marginTop: '20px' }}>Buscando...</div>}

                {results.length > 0 && (
                    <div className="grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '10px',
                        marginTop: '20px'
                    }}>
                        {results.map((it) => (
                            <div key={it.id} className="card" onClick={() => setActive(it)} style={{
                                position: 'relative', cursor: 'pointer', transition: 'transform 0.3s'
                            }}>
                                <img
                                    src={it.thumbnail}
                                    alt={it.title}
                                    style={{ width: '100%', height: 'auto', borderRadius: '4px', objectFit: 'cover', aspectRatio: '2/3' }}
                                    crossOrigin="anonymous"
                                />
                                <div className="card-info" style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    padding: '10px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'
                                }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{it.title}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && query && results.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#666' }}>
                        <p>No se encontraron resultados para "{query}"</p>
                    </div>
                )}

                {!query && (
                    <div style={{ marginTop: '50px', color: '#444' }}>
                        <h3>Escribe para buscar...</h3>
                    </div>
                )}
            </div>

            {active && (
                <MediaModal
                    item={active}
                    onClose={() => setActive(null)}
                />
            )}
        </main>
    );
}
