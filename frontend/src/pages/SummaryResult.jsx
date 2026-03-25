import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSummary } from '../api';

export default function SummaryResult() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getSummary(id);
                setSummary(res.data.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load summary");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, marginRight: '1rem' }}></div>
                Loading summary...
            </div>
        );
    }

    if (!summary) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Summary not found.</div>;
    }

    const formatTokens = (tokens) => {
        if (!tokens) return 'N/A';
        return tokens > 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens;
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                            AUTO-GENERATED
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {new Date(summary.created_at).toLocaleDateString()} • VIA {summary.source_type.toUpperCase()}
                        </span>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>
                        {summary.source_name}
                    </h1>
                    {summary.source_url && (
                        <a href={summary.source_url} target="_blank" rel="noreferrer" style={{ fontStyle: 'italic', color: 'var(--primary)', textDecoration: 'none', fontSize: '1.2rem', opacity: 0.9 }}>
                            View Original Source ↗
                        </a>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(41, 98, 255, 0.3)' }}>
                        ⬇ Download PDF
                    </button>
                    <button style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
                        Share
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                {/* Left Column - Main Content */}
                <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
                    {/* Decorative watermark */}
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '15rem', opacity: 0.02, userSelect: 'none', pointerEvents: 'none' }}>
                        📈
                    </div>

                    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', margin: '0 0 1rem 0' }}>Executive Overview</h2>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'var(--text-primary)', marginBottom: '3rem' }}>
                        {summary.detailed_summary || summary.overview}
                    </p>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem 0' }}>Key Strategic Insights</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                        {(summary.key_points || []).map((point, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1.25rem', background: 'var(--bg-elevated)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                                    {idx + 1}
                                </div>
                                <div style={{ lineHeight: 1.6, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                                    {point}
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem 0' }}>Action Items & Takeaways</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        {(summary.action_items || []).map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', borderBottom: '1px dashed var(--border)' }}>
                                <span style={{ color: 'var(--primary)' }}>✔</span>
                                <span style={{ color: 'var(--text-primary)' }}>{item}</span>
                            </div>
                        ))}
                    </div>
                    
                    {summary.important_concepts && summary.important_concepts.length > 0 && (
                        <>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '1rem 0 1rem 0' }}>Important Concepts</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {summary.important_concepts.map((concept, idx) => (
                                    <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {concept}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}

                    <div style={{ marginTop: '3rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1.5rem', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '1.1rem', background: 'linear-gradient(90deg, rgba(41, 98, 255, 0.05) 0%, transparent 100%)', padding: '1.5rem' }}>
                        "{summary.short_summary}" — AI Curator TL;DR
                    </div>
                </div>

                {/* Right Column - Sidebar */}
                <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: '1.5rem', flexShrink: 0 }}>
                    {/* Processing Intelligence */}
                    <div style={{ background: 'rgba(78,205,196,0.05)', border: '1px solid rgba(78,205,196,0.2)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem 0' }}>Processing Intelligence</h4>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Confidence</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ECDC4' }}>98.4%</span>
                        </div>
                        <div style={{ width: '100%', height: 6, background: 'var(--bg-card)', borderRadius: 3, marginBottom: '2rem', overflow: 'hidden' }}>
                            <div style={{ width: '98.4%', height: '100%', background: '#4ECDC4', borderRadius: 3 }}></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Length</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#333' }}>
                                    {summary.processing_metadata?.source_length_chars ? formatTokens(summary.processing_metadata.source_length_chars) : 'N/A'}
                                </div>
                            </div>
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tokens</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#333' }}>
                                    {formatTokens(summary.processing_metadata?.estimated_tokens)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem 0' }}>Quick Actions</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {['Translate Summary', 'Email to Stakeholders', 'Save to Cloud'].map((action, i) => (
                                <button key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', color: '#333', border: 'none', padding: '1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.05)'} onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ color: 'var(--primary)' }}>{i === 0 ? 'Aあ' : i === 1 ? '✉' : '☁'}</span>
                                        {action}
                                    </div>
                                    <span style={{ color: '#ccc' }}>›</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
