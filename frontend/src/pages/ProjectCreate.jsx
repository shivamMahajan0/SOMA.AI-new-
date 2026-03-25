import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, updateTarget, startTraining, uploadDocument } from '../api';

export default function ProjectCreate() {
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const [name, setName] = useState('New Project');
    const [file, setFile] = useState(null);
    const [columns, setColumns] = useState([]);
    const [target, setTarget] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [projectId, setProjectId] = useState(null);
    const [step, setStep] = useState(2); // Start at step 2 to match the design for dataset upload

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) { navigate('/login'); return; } //stores the dataset
    }, []);

    const handleFileDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files[0] || e.target.files[0];
        if (f && (f.name.endsWith('.csv') || f.name.endsWith('.pdf'))) {
            setFile(f);
            setError('');
        } else {
            setError('Please upload a CSV or PDF file');
        }
    };

    const handleUploadAndProceed = async () => {
        if (!file) return setError('Please upload a dataset first');
        
        setLoading(true);
        setError('');
        try {
            const isPdf = file.name.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                const fd = new FormData();
                fd.append('name', name);
                fd.append('file', file);
                const res = await uploadDocument(fd);
                navigate(`/document/${res.data.id}`);
            } else {
                if (!projectId) {
                    const fd = new FormData();
                    fd.append('name', name);
                    fd.append('file', file);
                    const res = await createProject(fd);
                    setProjectId(res.data.id);
                    setColumns(res.data.columns || []);
                    // Don't auto-proceed to next page yet, let user select target
                } else if (target) {
                    // Start training
                    await updateTarget(projectId, target);
                    await startTraining(projectId, { custom_mode: false });
                    navigate(`/project/${projectId}`);
                } else {
                    setError('Please select a target column');
                }
            }
        } catch (e) {
            setError(e.response?.data?.detail || 'Upload failed');
        }
        setLoading(false);
    };

    return (
        <div className="page-container" style={{ maxWidth: 1100 }}>
            {/* Header + Steps */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Create New Project</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Architecture Initialization Wizard</p>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Step {step} of 4</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload Dataset</p>
                </div>
            </div>

            {/* Step Indicators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 24, left: 0, right: 0, height: 2, background: 'var(--border)', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', top: 24, left: 0, width: '33%', height: 2, background: 'var(--primary)', zIndex: 0 }}></div>
                
                {/* Step 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1, width: 80 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid var(--bg-primary)', boxShadow: '0 0 15px var(--primary-glow)' }}>
                        ✓
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>Project</span>
                </div>
                
                {/* Step 2 (Active) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1, width: 80 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-card-solid)', border: '2px solid var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', boxShadow: '0 0 15px var(--primary-glow)' }}>
                        <div style={{ width: '100%', height: '100%', background: 'var(--primary-glow)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            ☁️
                        </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Dataset</span>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1, width: 80 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-card-solid)', border: '2px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🎯
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target</span>
                </div>

                {/* Step 4 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 1, width: 80 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-card-solid)', border: '2px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ⚡
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Training</span>
                </div>
            </div>

            {error && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,83,80,0.15)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-md)', color: 'var(--accent-red)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            {/* Main Card */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                <div className="project-create-grid">
                    
                    {/* Left Side: Upload & Config */}
                    <div>
                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'block', fontWeight: 600, letterSpacing: '0.05em' }}>PROJECT NAME</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., Customer Churn Prediction"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: '100%' }}
                            />
                        </div>

                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>Ingest Training Data</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Drag and drop your dataset file below. We support CSV, XLSX, and JSON formats up to 2GB for neural mapping.
                        </p>

                        <div
                            className={`upload-zone ${file ? 'active' : ''}`}
                            style={{ 
                                background: 'transparent',
                                borderColor: 'var(--border-dashed)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '3.5rem 2rem',
                                marginBottom: '2rem'
                            }}
                            onClick={() => fileRef.current?.click()}
                            onDrop={handleFileDrop}
                            onDragOver={e => e.preventDefault()}
                        >
                            <div style={{ width: 48, height: 48, background: 'var(--bg-elevated)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', border: '1px solid var(--border)' }}>
                                📄
                            </div>
                            {file ? (
                                <>
                                    <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name}</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        {(file.size / 1024 / 1024).toFixed(2)} MB Set
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Click to upload or drag & drop</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Maximum file size: 2.0GB
                                    </p>
                                </>
                            )}
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,.pdf"
                            style={{ display: 'none' }}
                            onChange={handleFileDrop}
                        />

                        {columns.length > 0 && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>SELECT TARGET COLUMN</label>
                                <select 
                                    className="form-select" 
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                    value={target} 
                                    onChange={e => setTarget(e.target.value)}
                                >
                                    <option value="" style={{ color: 'var(--text-primary)', background: 'var(--bg-input)' }}>Select column after upload...</option>
                                    {columns.map(col => (
                                        <option key={col} value={col} style={{ color: 'var(--text-primary)', background: 'var(--bg-input)' }}>{col}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {columns.length === 0 && (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>SELECT TARGET COLUMN</label>
                                <div style={{ padding: '0.75rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Select column after upload...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Data Structure Preview */}
                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '3rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>DATA STRUCTURE PREVIEW</span>
                            <span style={{ fontSize: '0.7rem', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>Waiting for input</span>
                        </div>

                        <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)' }}>
                            {columns.length > 0 ? (
                                <div style={{ overflowY: 'auto', maxHeight: '250px' }}>
                                    {columns.map((col, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}></div>
                                            <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{col}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>col</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* Skeleton Loader Lines */}
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ width: '30%', height: 24, background: 'var(--bg-input)', borderRadius: 4 }}></div>
                                        <div style={{ width: '30%', height: 24, background: 'var(--bg-input)', borderRadius: 4 }}></div>
                                        <div style={{ width: '30%', height: 24, background: 'var(--bg-input)', borderRadius: 4 }}></div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1rem' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(157, 114, 255, 0.5)' }}></div>
                                        <div style={{ flex: 1, height: 12, background: 'var(--bg-input)', borderRadius: 4 }}></div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(157, 114, 255, 0.3)' }}></div>
                                        <div style={{ width: '80%', height: 12, background: 'var(--bg-input)', borderRadius: 4 }}></div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(157, 114, 255, 0.2)' }}></div>
                                        <div style={{ width: '90%', height: 12, background: 'var(--bg-input)', borderRadius: 4 }}></div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(157, 114, 255, 0.1)' }}></div>
                                        <div style={{ width: '60%', height: 12, background: 'var(--bg-input)', borderRadius: 4 }}></div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Dataset metadata will appear here</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-secondary">
                        ← Previous
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                            Save as Draft
                        </button>
                        <button 
                            className="btn btn-primary btn-lg" 
                            style={{ 
                                background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', 
                                color: '#1A1A2E', 
                                position: 'relative',
                                padding: '0.8rem 2rem'
                            }}
                            onClick={handleUploadAndProceed}
                            disabled={loading || (!projectId && !file)}
                        >
                            {loading ? 'Processing...' : 'Initialize Processing 🚀'}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 'inherit', boxShadow: '0 0 20px rgba(224, 195, 252, 0.4)', zIndex: -1 }}></div>
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ℹ️ SOMA.AI Neural Architect automatically detects data types and distributions during upload.
                </span>
            </div>
        </div>
    );
}
