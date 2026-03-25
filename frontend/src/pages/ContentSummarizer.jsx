import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processSummary, getSummaries } from '../api';

export default function ContentSummarizer() {
    const navigate = useNavigate();
    const [recent, setRecent] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputs, setInputs] = useState({ youtube: '', web: '', document: '' });
    
    useEffect(() => {
        loadRecent();
    }, []);

    const loadRecent = async () => {
        try {
            const res = await getSummaries(4);
            setRecent(res.data.data || []);
        } catch (err) {
            console.error("Failed to load summaries", err);
        }
    };

    const handleProcess = async (type, payload) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('source_type', type);
        
        if (type === 'pdf') {
            formData.append('file', payload);
        } else {
            if (!payload) {
                setLoading(false);
                return;
            }
            formData.append('source_url', payload);
        }

        try {
            const res = await processSummary(formData);
            if (res.data.error) {
                alert(res.data.error);
            } else {
                navigate(`/summarizer/${res.data.data.id}`);
            }
        } catch (err) {
            alert(err.response?.data?.error || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0] || e.target.files[0];
        if (file) handleProcess('pdf', file);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            {loading && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <div className="spinner" style={{ width: 64, height: 64, borderWidth: 4, marginBottom: '1rem', borderColor: 'var(--primary) transparent transparent transparent' }}></div>
                    <h2 style={{ margin: 0 }}>Extracting and Synthesizing...</h2>
                    <p style={{ opacity: 0.7 }}>This might take 15-30 seconds depending on content length.</p>
                </div>
            )}

            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Generate New Summary</h1>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem' }}>
                    Harness AI to curate insights from any source in seconds.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '4rem' }}>
                {/* PDF Dropzone */}
                <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    style={{ background: 'rgba(78,205,196,0.03)', border: '2px dashed rgba(78,205,196,0.4)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', transition: 'all 0.3s' }}
                >
                    <div style={{ width: 64, height: 64, background: 'rgba(78,205,196,0.1)', color: '#4ECDC4', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '1.5rem' }}>
                        📄
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Upload PDF Document</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0' }}>Drag and drop your file here or browse computer</p>
                    <label style={{ cursor: 'pointer', background: 'rgba(78,205,196,0.15)', color: '#4ECDC4', padding: '0.75rem 2rem', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                        Select File
                        <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileDrop} />
                    </label>
                </div>

                {/* Link Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* YouTube */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#EF5350', fontWeight: 600 }}>
                            ▶ <span style={{ color: 'var(--text-primary)' }}>YOUTUBE LINK</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                                type="text"
                                placeholder="https://youtube.com/watch?v=..."
                                value={inputs.youtube}
                                onChange={(e) => setInputs({...inputs, youtube: e.target.value})}
                                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                                onKeyDown={(e) => e.key === 'Enter' && handleProcess('youtube', inputs.youtube)}
                            />
                            <button 
                                onClick={() => handleProcess('youtube', inputs.youtube)}
                                style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                →
                            </button>
                        </div>
                    </div>

                    {/* Web Article */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#42A5F5', fontWeight: 600 }}>
                            <span style={{ transform: 'rotate(45deg)' }}>🔗</span> <span style={{ color: 'var(--text-primary)' }}>WEB ARTICLE</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                                type="text"
                                placeholder="https://medium.com/article-slug"
                                value={inputs.web}
                                onChange={(e) => setInputs({...inputs, web: e.target.value})}
                                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                                onKeyDown={(e) => e.key === 'Enter' && handleProcess('web', inputs.web)}
                            />
                            <button 
                                onClick={() => handleProcess('web', inputs.web)}
                                style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                →
                            </button>
                        </div>
                    </div>

                    {/* Document Link */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#4CAF50', fontWeight: 600 }}>
                            📄 <span style={{ color: 'var(--text-primary)' }}>DOCUMENT LINK</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                                type="text"
                                placeholder="https://docs.google.com/..."
                                value={inputs.document}
                                onChange={(e) => setInputs({...inputs, document: e.target.value})}
                                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: 'var(--text-primary)', outline: 'none' }}
                                onKeyDown={(e) => e.key === 'Enter' && handleProcess('document', inputs.document)}
                            />
                            <button 
                                onClick={() => handleProcess('document', inputs.document)}
                                style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', width: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Summaries */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>Recent Summaries</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Your library of AI-distilled knowledge</p>
                    </div>
                    {/* Add View All link functionality if needed later */}
                    <a href="#" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>View All ↗</a>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {recent.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)' }}>No recent summaries. Generate one above to see it here.</div>
                    ) : (
                        recent.map(summary => (
                            <div 
                                key={summary.id} 
                                onClick={() => navigate(`/summarizer/${summary.id}`)}
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 700 }}>SUCCESS</span>
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {summary.source_name}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.5rem 0', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {summary.overview}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                    <span>{new Date(summary.created_at).toLocaleDateString()}</span>
                                    <span>{summary.source_type.toUpperCase()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
