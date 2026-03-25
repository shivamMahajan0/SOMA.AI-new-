import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject, getResults, downloadReport, listProjects } from '../api';

export default function Reports() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [results, setResults] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If no project ID, show list of all projects that have reports
        if (!id) {
            listProjects().then(res => {
                setProjects((res.data || []).filter(p => p.status === 'completed'));
                setLoading(false);
            }).catch(() => setLoading(false));
            return;
        }
        Promise.all([
            getProject(id),
            getResults(id).catch(() => ({ data: {} })),
        ]).then(([projRes, resultsRes]) => {
            setProject(projRes.data);
            setResults(resultsRes.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    const handleExportPdf = async () => {
        try {
            const res = await downloadReport(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project?.name || 'report'}_report.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Report download failed. Make sure the model has been trained.');
        }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    // List view when no project ID
    if (!id) {
        return (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>All Reports</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Select a completed project to view its performance report.</p>
                {projects.length === 0 ? (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No completed projects yet. Train a model first to see reports here.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {projects.map(p => (
                            <div key={p.id} onClick={() => navigate(`/project/${p.id}/reports`)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = '#D4B6FF'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{p.name}</h3>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.filename} — {p.task_type} — {p.num_rows?.toLocaleString()} rows</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ECDC4' }}>{p.best_model_score?.toFixed(4) || '—'}</div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.best_model_name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (!project) return <div className="page-container"><p>Project not found.</p></div>;

    const evaluations = results?.results?.evaluations || results?.evaluations || [];
    const bestIdx = results?.results?.best_model_index ?? results?.best_model_index;
    const bestEval = bestIdx != null ? evaluations[bestIdx] : null;
    const metrics = bestEval?.metrics || {};
    const fi = results?.results?.feature_importance || results?.feature_importance || {};
    const isReg = project.task_type === 'regression';

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem', fontFamily: 'Inter, sans-serif' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                        {project.name} — Report
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {project.filename} · {project.task_type} · Best: {project.best_model_name || '—'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleExportPdf} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📥 Export PDF
                    </button>
                    <Link to={`/project/${id}`} style={{ background: 'linear-gradient(90deg, #D4B6FF 0%, #E0C3FC 100%)', color: '#1A1A2E', border: 'none', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>

            {/* Primary Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {(isReg ? [
                    { label: 'R² Score', val: metrics.r2, color: '#4ECDC4' },
                    { label: 'RMSE', val: metrics.rmse, color: '#FFB6C1' },
                    { label: 'MAE', val: metrics.mae, color: '#D4B6FF' },
                    { label: 'CV Mean', val: metrics.cv_mean, color: '#FFA726' },
                ] : [
                    { label: 'Accuracy', val: metrics.accuracy, color: '#4ECDC4' },
                    { label: 'Precision', val: metrics.precision, color: '#D4B6FF' },
                    { label: 'Recall', val: metrics.recall, color: '#FFB6C1' },
                    { label: 'F1 Score', val: metrics.f1, color: '#FFA726' },
                ]).map((m, i) => (
                    <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{m.label}</span>
                        <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0 1rem', color: m.val != null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {m.val != null ? (m.label === 'Accuracy' ? `${(m.val * 100).toFixed(2)}%` : m.val.toFixed(4)) : '—'}
                        </div>
                        <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, (m.val || 0) * 100)}%`, height: '100%', background: m.color }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '6fr 4fr', gap: '2rem' }}>

                {/* Left — Confusion Matrix */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {!isReg && metrics.confusion_matrix && metrics.confusion_matrix.length > 0 && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 600 }}>Confusion Matrix</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 500, margin: '0 auto' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '0.75rem', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}></th>
                                            {(metrics.class_labels || []).map((l, i) => (
                                                <th key={i} style={{ padding: '0.75rem', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600 }}>Pred {String(l)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.confusion_matrix.map((row, ri) => (
                                            <tr key={ri}>
                                                <td style={{ padding: '0.75rem', border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem' }}>True {String((metrics.class_labels || [])[ri])}</td>
                                                {row.map((val, ci) => {
                                                    const maxVal = Math.max(...metrics.confusion_matrix.flat());
                                                    const opacity = maxVal > 0 ? (val / maxVal) * 0.7 + 0.1 : 0.1;
                                                    return (
                                                        <td key={ci} style={{ padding: '0.75rem', border: '1px solid var(--border)', textAlign: 'center', fontWeight: ri === ci ? 700 : 400, color: ri === ci ? '#4ECDC4' : 'var(--text-primary)', background: ri === ci ? `rgba(78,205,196,${opacity})` : `rgba(212,182,255,${opacity * 0.3})` }}>
                                                            {val}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* All Models Comparison */}
                    {evaluations.length > 0 && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 600 }}>Model Comparison</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>Model</th>
                                            <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border)' }}>{isReg ? 'R²' : 'Accuracy'}</th>
                                            <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border)' }}>{isReg ? 'RMSE' : 'F1'}</th>
                                            <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--border)' }}>CV Mean</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evaluations.map((ev, i) => (
                                            <tr key={i} style={{ background: i === bestIdx ? 'rgba(78,205,196,0.05)' : 'transparent' }}>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                                    <strong>{ev.name}</strong>
                                                    {i === bestIdx && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'rgba(78,205,196,0.15)', color: '#4ECDC4', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 700 }}>BEST</span>}
                                                    {ev.error && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'rgba(239,83,80,0.15)', color: '#EF5350', padding: '0.15rem 0.4rem', borderRadius: 4 }}>Error</span>}
                                                </td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{isReg ? ev.metrics?.r2?.toFixed(4) : ev.metrics?.accuracy?.toFixed(4) || '—'}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{isReg ? ev.metrics?.rmse?.toFixed(4) : ev.metrics?.f1?.toFixed(4) || '—'}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{ev.metrics?.cv_mean?.toFixed(4) || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — Insights & Feature Importance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* AI Analysis Insight */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, rgba(212,182,255,0.2), rgba(224,195,252,0.1))', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#D4B6FF' }}>✨</div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Model Summary</h3>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                            {bestEval ? `The best performing model is ${bestEval.name} with ${isReg ? `an R² score of ${metrics.r2?.toFixed(4)}` : `an F1 score of ${metrics.f1?.toFixed(4)} and accuracy of ${(metrics.accuracy * 100)?.toFixed(2)}%`}. Cross-validation mean is ${metrics.cv_mean?.toFixed(4) || '—'}.` : 'No completed model evaluation found.'}
                        </p>
                        {bestEval && !isReg && (
                            <div style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid #4ECDC4' }}>
                                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: 600 }}>Quick Note</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {metrics.recall < metrics.precision ? 'Recall is lower than precision — consider adjusting the decision threshold if false negatives are costly.' : 'Precision and recall are well balanced.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Feature Importance */}
                    {fi.names && fi.names.length > 0 && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', flex: 1 }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 600 }}>Feature Importance</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {fi.names.slice(0, 6).map((name, idx) => {
                                    const maxVal = Math.max(...fi.values);
                                    const pct = maxVal > 0 ? (fi.values[idx] / maxVal) * 100 : 0;
                                    return (
                                        <div key={idx}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{name}</span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fi.values[idx]?.toFixed(3)}</span>
                                            </div>
                                            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: idx % 2 === 0 ? '#D4B6FF' : '#FFB6C1', borderRadius: 4 }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
