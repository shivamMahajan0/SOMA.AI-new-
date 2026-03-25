import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getSchema, predict } from '../api';

export default function Predict() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [schema, setSchema] = useState(null);
    const [features, setFeatures] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [predicting, setPredicting] = useState(false);
    const [history, setHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('single');

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        Promise.all([
            getProject(id),
            getSchema(id).catch(() => ({ data: {} })),
        ]).then(([projRes, schemaRes]) => {
            setProject(projRes.data);
            setSchema(schemaRes.data);
            // Initialize features with default values
            const defaults = {};
            if (schemaRes.data?.features) {
                schemaRes.data.features.forEach(f => {
                    if (f.type === 'numeric') {
                        defaults[f.name] = f.default ?? f.mean ?? 0;
                    } else {
                        defaults[f.name] = f.default ?? (f.categories?.[0] || '');
                    }
                });
            }
            setFeatures(defaults);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    const handlePredict = async () => {
        if (!id) return;
        setPredicting(true);
        try {
            const res = await predict(id, features);
            const newResult = {
                prediction: res.data.prediction,
                confidence: res.data.confidence,
                probabilities: res.data.probabilities,
                timestamp: new Date().toLocaleTimeString(),
                inputSummary: Object.entries(features).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') + '...',
            };
            setResult(newResult);
            setHistory(prev => [newResult, ...prev]);
        } catch (err) {
            setResult({ error: err.response?.data?.detail || 'Prediction failed. Ensure the model is trained.' });
        }
        setPredicting(false);
    };

    const handleReset = () => {
        if (schema?.features) {
            const defaults = {};
            schema.features.forEach(f => {
                if (f.type === 'numeric') {
                    defaults[f.name] = f.default ?? f.mean ?? 0;
                } else {
                    defaults[f.name] = f.default ?? (f.categories?.[0] || '');
                }
            });
            setFeatures(defaults);
        }
        setResult(null);
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
    if (!project) return <div className="page-container"><p>Project not found.</p></div>;

    const isReg = project.task_type === 'regression';
    const featureList = schema?.features || [];

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        Predictive Inference: {project.name}
                    </h1>
                    <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)' }}>
                        <div onClick={() => setActiveTab('single')} style={{ paddingBottom: '0.75rem', color: activeTab === 'single' ? '#FFB6C1' : 'var(--text-secondary)', fontWeight: activeTab === 'single' ? 700 : 500, borderBottom: activeTab === 'single' ? '2px solid #FFB6C1' : 'none', cursor: 'pointer' }}>Single Prediction</div>
                        <div onClick={() => setActiveTab('history')} style={{ paddingBottom: '0.75rem', color: activeTab === 'history' ? '#FFB6C1' : 'var(--text-secondary)', fontWeight: activeTab === 'history' ? 700 : 500, borderBottom: activeTab === 'history' ? '2px solid #FFB6C1' : 'none', cursor: 'pointer' }}>History ({history.length})</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', paddingBottom: '0.5rem' }}>
                    <button onClick={handleReset} style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                        Reset
                    </button>
                    <Link to={`/project/${id}`} style={{ background: 'rgba(212,182,255,0.1)', color: '#D4B6FF', border: '1px solid rgba(212,182,255,0.3)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                        ← Dashboard
                    </Link>
                </div>
            </div>

            {activeTab === 'single' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>

                    {/* Feature Configuration Panel */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 2rem 0' }}>Feature Configuration</h2>

                        {featureList.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <p>No schema available. Make sure the model is trained first.</p>
                                <Link to={`/project/${id}`} style={{ color: '#D4B6FF', textDecoration: 'none', fontWeight: 600 }}>Go to Dashboard →</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                {featureList.map(f => (
                                    <div key={f.name}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>{f.name}</label>
                                        {f.type === 'numeric' ? (
                                            <input
                                                type="number"
                                                step="any"
                                                value={features[f.name] ?? ''}
                                                onChange={e => setFeatures(prev => ({ ...prev, [f.name]: parseFloat(e.target.value) || 0 }))}
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                                            />
                                        ) : (
                                            <select
                                                value={features[f.name] ?? ''}
                                                onChange={e => setFeatures(prev => ({ ...prev, [f.name]: e.target.value }))}
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                                            >
                                                {(f.categories || []).map(c => (
                                                    <option key={c} value={c} style={{ color: '#000' }}>{c}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Result Panel */}
                    <div style={{ background: 'var(--bg-card)', border: `1px solid ${result?.error ? 'rgba(239,83,80,0.3)' : result ? 'rgba(78,205,196,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Latest Output</h2>
                            {result && !result.error && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Just now</span>}
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {result ? (
                                result.error ? (
                                    <div style={{ color: '#EF5350', fontSize: '0.95rem' }}>⚠️ {result.error}</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'inline-block', background: isReg ? 'rgba(78,205,196,0.1)' : (String(result.prediction).includes('1') || String(result.prediction).toLowerCase().includes('yes') || String(result.prediction).toLowerCase().includes('churn')) ? 'rgba(239,83,80,0.1)' : 'rgba(78,205,196,0.1)', color: isReg ? '#4ECDC4' : (String(result.prediction).includes('1') || String(result.prediction).toLowerCase().includes('yes') || String(result.prediction).toLowerCase().includes('churn')) ? '#EF5350' : '#4ECDC4', border: `1px solid ${isReg ? 'rgba(78,205,196,0.3)' : (String(result.prediction).includes('1') || String(result.prediction).toLowerCase().includes('yes') || String(result.prediction).toLowerCase().includes('churn')) ? 'rgba(239,83,80,0.3)' : 'rgba(78,205,196,0.3)'}`, padding: '0.75rem 1.5rem', borderRadius: '2rem', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                            {isReg ? `📈 ${Number(result.prediction).toFixed(4)}` : `🎯 ${String(result.prediction)}`}
                                        </div>
                                        {result.confidence != null && (
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                CONFIDENCE: {(result.confidence * 100).toFixed(1)}%
                                            </div>
                                        )}
                                    </>
                                )
                            ) : (
                                <div style={{ color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎯</div>
                                    <p>Configure features and click "Run Prediction"</p>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button onClick={handlePredict} disabled={predicting || featureList.length === 0} style={{ background: 'linear-gradient(90deg, #D4B6FF 0%, #FFB6C1 100%)', color: '#1A1A2E', border: 'none', padding: '1rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '1rem', cursor: predicting ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(212,182,255,0.3)', opacity: predicting ? 0.7 : 1 }}>
                                {predicting ? 'Predicting...' : 'RUN PREDICTION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prediction History */}
            {(activeTab === 'history' || (activeTab === 'single' && history.length > 0)) && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>Prediction History</h2>
                    {history.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No predictions yet. Run a prediction to see results here.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                    <th style={{ padding: '1rem 0', fontWeight: 500 }}>Timestamp</th>
                                    <th style={{ padding: '1rem 0', fontWeight: 500 }}>Input Summary</th>
                                    <th style={{ padding: '1rem 0', fontWeight: 500 }}>Prediction</th>
                                    <th style={{ padding: '1rem 0', fontWeight: 500 }}>Confidence</th>
                                </tr>
                            </thead>
                            <tbody style={{ fontSize: '0.9rem' }}>
                                {history.map((h, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>{h.timestamp}</td>
                                        <td style={{ padding: '1rem 0', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.inputSummary}</td>
                                        <td style={{ padding: '1rem 0' }}>
                                            <span style={{ color: '#4ECDC4', background: 'rgba(78,205,196,0.1)', padding: '0.2rem 0.5rem', borderRadius: 4, fontWeight: 600, fontSize: '0.75rem' }}>
                                                {String(h.prediction)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 0', fontWeight: 600 }}>{h.confidence != null ? `${(h.confidence * 100).toFixed(1)}%` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
