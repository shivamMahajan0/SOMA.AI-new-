import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getResults, getStatus, getDataPreview, downloadReport, downloadDataset, downloadModel } from '../api';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
    ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartColors = ['#6C63FF', '#4ECDC4', '#FF6B9D', '#FFA726', '#66BB6A', '#AB47BC', '#26C6DA', '#EF5350'];

export default function Dashboard() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    const fetchProject = useCallback(async () => {
        try {
            const [projRes, resultsRes] = await Promise.all([
                getProject(id),
                getResults(id).catch(() => ({ data: {} })),
            ]);
            const merged = {
                ...projRes.data,
                profile: resultsRes.data.profile || projRes.data.profile || {},
                results: resultsRes.data.results || projRes.data.results || {},
                best_model_name: resultsRes.data.best_model_name || projRes.data.best_model_name,
                best_model_score: resultsRes.data.best_model_score || projRes.data.best_model_score,
            };
            setProject(merged);
            setLoading(false);
        } catch (e) {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchProject();
    }, [fetchProject]);

    // Poll status while training
    useEffect(() => {
        if (!project) return;
        const inProgress = ['profiling', 'preprocessing', 'training', 'evaluating', 'explaining'];
        if (!inProgress.includes(project.status)) return;

        const interval = setInterval(async () => {
            try {
                const res = await getStatus(id);
                if (!inProgress.includes(res.data.status)) {
                    clearInterval(interval);
                    fetchProject();
                } else {
                    // Also try to fetch profile for AI analysis
                    try {
                        const projRes = await getProject(id);
                        setProject(prev => ({
                            ...prev,
                            status: res.data.status,
                            profile: projRes.data.profile || prev.profile,
                        }));
                    } catch {
                        setProject(prev => ({ ...prev, status: res.data.status }));
                    }
                }
            } catch { }
        }, 3000);
        return () => clearInterval(interval);
    }, [project?.status, id, fetchProject]);

    const handleDownload = async (fn, filename) => {
        try {
            const res = await fn(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) { alert('Download failed'); }
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading project...</p></div>;
    if (!project) return <div className="page-container"><p>Project not found.</p></div>;

    const profile = project.profile || {};
    const results = project.results || {};
    const evaluations = results.evaluations || [];
    const isRegression = project.task_type === 'regression';

    // Training in progress
    const inProgress = ['profiling', 'preprocessing', 'training', 'evaluating', 'explaining'];
    if (inProgress.includes(project.status)) {
        const steps = ['profiling', 'preprocessing', 'training', 'evaluating', 'explaining'];
        const currentIdx = steps.indexOf(project.status);
        const progress = ((currentIdx + 1) / steps.length) * 100;
        const aiAnalysis = profile?.ai_analysis || '';

        return (
            <div className="page-container" style={{ maxWidth: 700 }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner" />
                    <h2 style={{ marginBottom: '1rem' }}>Training in Progress</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', textTransform: 'capitalize' }}>
                        Stage: <strong style={{ color: 'var(--primary)' }}>{project.status}</strong>
                    </p>
                    <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                        {steps.map((s, i) => (
                            <span key={s} style={{ fontSize: '0.7rem', color: i <= currentIdx ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</span>
                        ))}
                    </div>
                </div>

                {/* AI Dataset Analysis */}
                {aiAnalysis && (
                    <div className="ai-insight-card" style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧠</span>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Dataset Analysis</h3>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem' }}>
                            {aiAnalysis}
                        </p>
                    </div>
                )}

                {!aiAnalysis && currentIdx >= 1 && (
                    <div className="ai-insight-card" style={{ marginTop: '1.5rem', opacity: 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧠</span>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generating AI dataset analysis...</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (project.status === 'failed') {
        return (
            <div className="page-container" style={{ maxWidth: 600 }}>
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                    <h2>Training Failed</h2>
                    <p style={{ color: 'var(--accent-red)', marginTop: '0.5rem' }}>
                        {results.error || 'An error occurred during training.'}
                    </p>
                    <Link to="/new" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Try Again</Link>
                </div>
            </div>
        );
    }

    const tabs = ['overview', 'models', 'best-model', 'downloads'];

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>{project.name}</h1>
                <p>{project.filename} — {project.num_rows?.toLocaleString()} rows × {project.num_features} columns — {project.task_type}</p>
            </div>

            {/* Stats */}
            <div className="stats-row">
                <div className="stat-card"><div className="stat-value">{project.num_rows?.toLocaleString()}</div><div className="stat-label">Rows</div></div>
                <div className="stat-card"><div className="stat-value">{project.num_features}</div><div className="stat-label">Features</div></div>
                <div className="stat-card"><div className="stat-value">{project.best_model_name || '—'}</div><div className="stat-label">Best Model</div></div>
                <div className="stat-card"><div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{project.best_model_score?.toFixed(4) || '—'}</div><div className="stat-label">{isRegression ? 'R²' : 'F1 Score'}</div></div>
            </div>

            {/* Post-Training Actions */}
            {project.status === 'completed' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <Link to={`/project/${id}/reports`} className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', transition: 'border-color 0.2s' }}>
                        📊 View Report
                    </Link>
                    <Link to={`/project/${id}/code`} className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                        💻 View Code
                    </Link>
                    <Link to={`/project/${id}/copilot`} className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                        🧠 Chat with Dataset
                    </Link>
                    <Link to={`/project/${id}/predict`} className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                        🎯 Make Predictions
                    </Link>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs">
                {tabs.map(t => (
                    <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                        {t === 'overview' ? '📊 Dataset Insights' : t === 'models' ? '🤖 Model Comparison' : t === 'best-model' ? '🏆 Best Model' : '📥 Downloads'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && <OverviewTab profile={profile} project={project} projectId={id} />}
            {activeTab === 'models' && <ModelsTab evaluations={evaluations} isRegression={isRegression} />}
            {activeTab === 'best-model' && <BestModelTab results={results} evaluations={evaluations} isRegression={isRegression} project={project} />}
            {activeTab === 'downloads' && (
                <div className="card-grid">
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                        <h3>Cleaned Dataset</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0 1rem' }}>Preprocessed CSV file</p>
                        <button className="btn btn-primary btn-sm" onClick={() => handleDownload(downloadDataset, `${project.name}_cleaned.csv`)}>Download CSV</button>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🧠</div>
                        <h3>Trained Model</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0 1rem' }}>Pickle model file (.pkl)</p>
                        <button className="btn btn-primary btn-sm" onClick={() => handleDownload(downloadModel, `${project.name}_model.pkl`)}>Download Model</button>
                    </div>
                    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📑</div>
                        <h3>PDF Report</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0 1rem' }}>Full training report</p>
                        <button className="btn btn-primary btn-sm" onClick={() => handleDownload(downloadReport, `${project.name}_report.pdf`)}>Download PDF</button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* Sub-components */
function OverviewTab({ profile, project, projectId }) {
    const missing = profile.missing_values || {};
    const correlations = profile.correlations || {};
    const target = profile.target || {};
    const distributions = profile.distributions || {};
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (projectId) {
            getDataPreview(projectId).then(r => setPreview(r.data)).catch(() => { });
        }
    }, [projectId]);

    return (
        <div>
            {/* AI Analysis */}
            {profile.ai_analysis && (
                <div className="ai-insight-card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>🧠</span>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>AI Dataset Analysis</h4>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                        {profile.ai_analysis}
                    </p>
                </div>
            )}

            {/* Dataset Preview Table */}
            {preview && preview.rows && preview.rows.length > 0 && (
                <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
                    <h4>📋 Dataset Preview (First 10 Rows)</h4>
                    <div className="table-scroll-wrapper">
                        <table className="data-table data-preview-table">
                            <thead>
                                <tr>
                                    {preview.columns.map((col, i) => (
                                        <th key={i}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.rows.map((row, i) => (
                                    <tr key={i}>
                                        {row.map((val, j) => (
                                            <td key={j}>{String(val)}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Missing Values */}
            {Object.keys(missing).length > 0 && (
                <div className="chart-container chart-container-sm" style={{ marginBottom: '1.5rem' }}>
                    <h4>⚠️ Missing Values</h4>
                    <Bar data={{
                        labels: Object.keys(missing).slice(0, 12),
                        datasets: [{
                            label: 'Missing Count',
                            data: Object.values(missing).slice(0, 12).map(v => v.count),
                            backgroundColor: '#EF5350',
                            borderRadius: 6,
                            barPercentage: 0.6,
                            categoryPercentage: 0.7,
                        }],
                    }} options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 11 } } },
                            x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } }
                        }
                    }} />
                </div>
            )}

            {/* Class Balance */}
            {target.class_balance && (
                <div className="chart-container">
                    <h4>📊 Class Distribution {target.is_imbalanced ? '⚠️ Imbalanced' : '✅ Balanced'}</h4>
                    <div style={{ maxWidth: 360, margin: '0 auto' }}>
                        <Doughnut data={{
                            labels: Object.keys(target.class_balance),
                            datasets: [{
                                data: Object.values(target.class_balance),
                                backgroundColor: chartColors,
                                borderWidth: 0,
                            }],
                        }} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                </div>
            )}

            {/* Correlation Matrix */}
            {correlations.labels && correlations.labels.length > 1 && project.target_column && correlations.matrix[project.target_column] && (
                <div className="chart-container">
                    <h4>🔗 Feature Correlation with Target</h4>
                    {(() => {
                        const targetCorr = correlations.matrix[project.target_column];
                        const entries = Object.entries(targetCorr)
                            .filter(([k]) => k !== project.target_column)
                            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                            .slice(0, 15);
                        return (
                            <Bar data={{
                                labels: entries.map(([k]) => k),
                                datasets: [{
                                    label: 'Correlation',
                                    data: entries.map(([, v]) => v),
                                    backgroundColor: entries.map(([, v]) => v >= 0 ? '#4ECDC4' : '#FF6B9D'),
                                    borderRadius: 4,
                                }],
                            }} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { min: -1, max: 1, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } } }} />
                        );
                    })()}
                </div>
            )}

            {/* Feature Distributions */}
            {Object.keys(distributions).length > 0 && (
                <div className="chart-container">
                    <h4>📈 Feature Distributions (Top 4)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                        {Object.entries(distributions).slice(0, 4).map(([col, dist]) => (
                            <div key={col} style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>{col}</p>
                                <Bar data={{
                                    labels: dist.bin_edges.slice(0, -1).map(b => b.toFixed(1)),
                                    datasets: [{ data: dist.counts, backgroundColor: '#6C63FF', borderRadius: 2 }],
                                }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }} height={80} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ModelsTab({ evaluations, isRegression }) {
    if (!evaluations.length) return <div className="empty-state"><p>No model results yet.</p></div>;

    const validModels = evaluations.filter(e => !e.error && e.metrics);
    const primaryMetric = isRegression ? 'r2' : 'f1';

    return (
        <div>
            {/* Bar Chart Comparison */}
            {validModels.length > 0 && (
                <div className="chart-container">
                    <h4>📊 Model Performance Comparison ({isRegression ? 'R²' : 'F1 Score'})</h4>
                    <Bar data={{
                        labels: validModels.map(m => m.name),
                        datasets: [{
                            label: isRegression ? 'R²' : 'F1 Score',
                            data: validModels.map(m => m.metrics?.[primaryMetric] || 0),
                            backgroundColor: chartColors.slice(0, validModels.length),
                            borderRadius: 8,
                        }],
                    }} options={{
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, max: 1, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
                    }} />
                </div>
            )}

            {/* ROC Curve */}
            {!isRegression && validModels.some(m => m.metrics?.roc?.fpr) && (
                <div className="chart-container">
                    <h4>📈 ROC Curve</h4>
                    {(() => {
                        const modelWithRoc = validModels.find(m => m.metrics?.roc?.fpr);
                        if (!modelWithRoc) return null;
                        const roc = modelWithRoc.metrics.roc;
                        return (
                            <Line data={{
                                labels: roc.fpr,
                                datasets: [
                                    { label: `${modelWithRoc.name} (AUC: ${roc.auc})`, data: roc.tpr, borderColor: '#6C63FF', fill: { target: 'origin', above: 'rgba(108,99,255,0.1)' }, tension: 0.3, pointRadius: 0 },
                                    { label: 'Random', data: roc.fpr, borderColor: '#555', borderDash: [5, 5], pointRadius: 0 },
                                ],
                            }} options={{ responsive: true, scales: { x: { title: { display: true, text: 'FPR' } }, y: { title: { display: true, text: 'TPR' } } } }} />
                        );
                    })()}
                </div>
            )}

            {/* Metrics Table */}
            <div className="card" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Model</th>
                            {isRegression ? <><th>R²</th><th>RMSE</th><th>MAE</th></> : <><th>Accuracy</th><th>F1</th><th>Precision</th><th>Recall</th></>}
                            <th>CV Mean ± Std</th>
                        </tr>
                    </thead>
                    <tbody>
                        {evaluations.map((ev, i) => (
                            <tr key={i}>
                                <td><strong>{ev.name}</strong> {ev.error && <span className="badge badge-error" title={ev.error}>Error</span>}</td>
                                {isRegression ? (
                                    <><td>{ev.metrics?.r2?.toFixed(4) || '—'}</td><td>{ev.metrics?.rmse?.toFixed(4) || '—'}</td><td>{ev.metrics?.mae?.toFixed(4) || '—'}</td></>
                                ) : (
                                    <><td>{ev.metrics?.accuracy?.toFixed(4) || '—'}</td><td>{ev.metrics?.f1?.toFixed(4) || '—'}</td><td>{ev.metrics?.precision?.toFixed(4) || '—'}</td><td>{ev.metrics?.recall?.toFixed(4) || '—'}</td></>
                                )}
                                <td>{ev.metrics?.cv_mean?.toFixed(4) || '—'} ± {ev.metrics?.cv_std?.toFixed(4) || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function BestModelTab({ results, evaluations, isRegression, project }) {
    const bestIdx = results?.best_model_index;
    const bestEval = bestIdx != null ? evaluations[bestIdx] : null;
    const metrics = bestEval?.metrics || {};
    const fi = results?.feature_importance || {};
    const shap = results?.shap_global || {};

    return (
        <div>
            {/* Best Model Stats */}
            {bestEval && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3>🏆 {bestEval.name}</h3>
                        <span className="badge badge-success">Best Model</span>
                    </div>
                    <div className="metric-grid">
                        {isRegression ? (
                            <>
                                <div className="metric-card"><div className="value">{metrics.r2?.toFixed(4) || '—'}</div><div className="label">R²</div></div>
                                <div className="metric-card"><div className="value">{metrics.rmse?.toFixed(4) || '—'}</div><div className="label">RMSE</div></div>
                                <div className="metric-card"><div className="value">{metrics.mae?.toFixed(4) || '—'}</div><div className="label">MAE</div></div>
                            </>
                        ) : (
                            <>
                                <div className="metric-card"><div className="value">{metrics.accuracy?.toFixed(4) || '—'}</div><div className="label">Accuracy</div></div>
                                <div className="metric-card"><div className="value">{metrics.f1?.toFixed(4) || '—'}</div><div className="label">F1 Score</div></div>
                                <div className="metric-card"><div className="value">{metrics.precision?.toFixed(4) || '—'}</div><div className="label">Precision</div></div>
                                <div className="metric-card"><div className="value">{metrics.recall?.toFixed(4) || '—'}</div><div className="label">Recall</div></div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Confusion Matrix */}
            {metrics.confusion_matrix && metrics.confusion_matrix.length > 0 && (
                <div className="chart-container">
                    <h4>🔲 Confusion Matrix</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ maxWidth: 400, margin: '0 auto' }}>
                            <thead>
                                <tr><th></th>{(metrics.class_labels || []).map((l, i) => <th key={i}>Pred {String(l)}</th>)}</tr>
                            </thead>
                            <tbody>
                                {metrics.confusion_matrix.map((row, i) => (
                                    <tr key={i}>
                                        <td><strong>True {String((metrics.class_labels || [])[i])}</strong></td>
                                        {row.map((val, j) => (
                                            <td key={j} style={{ fontWeight: i === j ? 700 : 400, color: i === j ? 'var(--accent-cyan)' : 'var(--text-primary)', background: i === j ? 'rgba(78,205,196,0.1)' : 'transparent' }}>{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Feature Importance */}
            {fi.names && fi.names.length > 0 && (
                <div className="chart-container">
                    <h4>📊 Feature Importance</h4>
                    <Bar data={{
                        labels: fi.names.slice(0, 15),
                        datasets: [{ label: 'Importance', data: fi.values.slice(0, 15), backgroundColor: '#4ECDC4', borderRadius: 6 }],
                    }} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } } }} />
                </div>
            )}

            {/* SHAP Global */}
            {shap.names && shap.names.length > 0 && (
                <div className="chart-container">
                    <h4>🔍 SHAP Global Explanation</h4>
                    <Bar data={{
                        labels: shap.names.slice(0, 15),
                        datasets: [{ label: 'Mean |SHAP|', data: shap.values.slice(0, 15), backgroundColor: '#FF6B9D', borderRadius: 6 }],
                    }} options={{ indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } } }} />
                </div>
            )}
        </div>
    );
}
