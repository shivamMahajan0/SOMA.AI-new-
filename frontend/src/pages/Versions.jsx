import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getVersions, startTraining, getProject } from '../api';

export default function Versions() {
    const { id } = useParams();
    const [versions, setVersions] = useState([]);
    const [project, setProject] = useState(null);
    const [retraining, setRetraining] = useState(false);

    useEffect(() => {
        getVersions(id).then(r => setVersions(r.data)).catch(() => { });
        getProject(id).then(r => setProject(r.data)).catch(() => { });
    }, [id]);

    const handleRetrain = async () => {
        setRetraining(true);
        try {
            await startTraining(id);
            window.location.href = `/project/${id}`;
        } catch (e) {
            alert(e.response?.data?.detail || 'Retrain failed');
        }
        setRetraining(false);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Model Versions</h1>
                <p>Track training history and compare model versions</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button className="btn btn-primary" onClick={handleRetrain} disabled={retraining}>
                    {retraining ? 'Starting...' : '🔄 Retrain Model'}
                </button>
            </div>

            {versions.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📦</div>
                    <h3>No Versions Yet</h3>
                    <p>Train your model to create the first version</p>
                </div>
            ) : (
                <div className="card" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Version</th>
                                <th>Model</th>
                                <th>Status</th>
                                <th>Key Metrics</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {versions.map(v => {
                                const metrics = v.metrics || {};
                                const evals = metrics.evaluations || [];
                                const bestIdx = metrics.best_model_index;
                                const bestMetrics = bestIdx != null && evals[bestIdx] ? evals[bestIdx].metrics || {} : {};

                                return (
                                    <tr key={v.id}>
                                        <td>
                                            <strong>v{v.version}</strong>
                                        </td>
                                        <td>{v.model_name}</td>
                                        <td>
                                            {v.is_best ? (
                                                <span className="badge badge-success">🏆 Current Best</span>
                                            ) : (
                                                <span className="badge badge-default">Previous</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>
                                            {project?.task_type === 'regression' ? (
                                                <>R²: {bestMetrics.r2?.toFixed(4) || '—'} | RMSE: {bestMetrics.rmse?.toFixed(4) || '—'}</>
                                            ) : (
                                                <>F1: {bestMetrics.f1?.toFixed(4) || '—'} | Acc: {bestMetrics.accuracy?.toFixed(4) || '—'}</>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {new Date(v.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
