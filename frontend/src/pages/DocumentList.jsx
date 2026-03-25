import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listDocuments } from '../api';

export default function DocumentList() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listDocuments()
            .then(res => { setDocuments(res.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Documents</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>All uploaded PDF documents and their extracted data.</p>
                </div>
                <Link to="/new" style={{ background: 'linear-gradient(90deg, #D4B6FF 0%, #E0C3FC 100%)', color: '#1A1A2E', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ＋ Upload Document
                </Link>
            </div>

            {documents.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Documents Yet</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Upload a PDF document to extract tables, charts, and chat with it.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {documents.map(doc => (
                        <div key={doc.id} onClick={() => navigate(`/document/${doc.id}`)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#D4B6FF'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: 44, height: 44, background: 'rgba(212,182,255,0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📄</div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{doc.name || doc.filename}</h3>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{doc.page_count || '?'} pages · {doc.tables?.length || 0} tables</span>
                                </div>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
