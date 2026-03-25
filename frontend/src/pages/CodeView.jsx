import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject } from '../api';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import 'highlight.js/styles/tokyo-night-dark.css';

hljs.registerLanguage('python', python);

export default function CodeView() {
    const { id } = useParams();
    const codeRef = useRef(null);
    const [code, setCode] = useState('');
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        getProject(id)
            .then(res => {
                setProject(res.data);
                setCode(res.data.code_generated || '# No generated code yet.\n# Train a model first to see the reproducible pipeline code here.');
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (codeRef.current && code) {
            codeRef.current.innerHTML = hljs.highlight(code, { language: 'python' }).value;
        }
    }, [code]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project?.name || 'pipeline'}_code.py`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    const lines = code.split('\n').map((_, i) => i + 1);
    const projectName = project?.name || 'Project';
    const fileName = `${projectName.toLowerCase().replace(/\s+/g, '_')}_pipeline.py`;

    return (
        <div style={{ display: 'flex', gap: '1px', background: 'var(--border)', height: 'calc(100vh - 85px)', margin: '-2rem', marginTop: 0 }}>

            {/* Left Sidebar: Explorer */}
            <div style={{ width: 260, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Explorer
                </div>
                <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>▶</span> 📁 {projectName}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem', background: 'rgba(157,114,255,0.1)', color: 'var(--primary)', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7em' }}>▼</span> 📄 {fileName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
                                <span style={{ color: 'transparent', fontSize: '0.7em' }}>▶</span> 📄 requirements.txt
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
                                <span style={{ color: 'transparent', fontSize: '0.7em' }}>▶</span> 📄 README.md
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                {id && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Link to={`/project/${id}`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📊 Dashboard</Link>
                        <Link to={`/project/${id}/reports`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📑 Report</Link>
                        <Link to={`/project/${id}/copilot`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🧠 Copilot</Link>
                    </div>
                )}
            </div>

            {/* Middle: Code Editor */}
            <div style={{ flex: 1, background: '#0d0d0d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Editor Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex' }}>
                        <div style={{ padding: '0.75rem 1.5rem', background: '#0d0d0d', borderRight: '1px solid var(--border)', borderTop: '2px solid var(--primary)', color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--accent-cyan)' }}>◫</span> {fileName}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '1rem' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {projectName} / {fileName}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={handleCopy} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                                {copied ? '✅ Copied' : '📋 Copy'}
                            </button>
                            <button onClick={handleDownload} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                                ⬇ Download .py
                            </button>
                        </div>
                    </div>
                </div>

                {/* Editor Area with Line Numbers */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
                    <div style={{ padding: '1.5rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', userSelect: 'none' }}>
                        {lines.map(l => (
                            <div key={l} style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.85rem', lineHeight: '1.5', fontFamily: '"Fira Code", monospace', padding: '0 1rem' }}>
                                {l}
                            </div>
                        ))}
                    </div>
                    <div style={{ flex: 1, padding: '1.5rem 1rem', overflowX: 'auto' }}>
                        <pre style={{ margin: 0 }}>
                            <code ref={codeRef} className="language-python" style={{ background: 'transparent', padding: 0, fontSize: '0.85rem', lineHeight: '1.5', fontFamily: '"Fira Code", monospace' }}>
                            </code>
                        </pre>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: Code Info */}
            <div style={{ width: 320, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pipeline Info
                </div>
                <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {project && (
                        <>
                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--accent-cyan)' }}>📊</span> Project Details
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Dataset</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{project.filename}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Rows</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{project.num_rows?.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Task Type</span>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{project.task_type}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Best Model</span>
                                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '0.85rem' }}>{project.best_model_name || '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Score</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>{project.best_model_score?.toFixed(4) || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#FFD700' }}>💡</span> About This Code
                                </h4>
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                        This code is auto-generated after training. It reproduces the complete ML pipeline — data loading, preprocessing, model training, evaluation, and saving — so you can run it independently.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <div>📝 Lines: {lines.length}</div>
                                <div>🐍 Language: Python</div>
                                <div>📦 Status: {project.status === 'completed' ? '✅ Ready' : '⏳ Pending'}</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
