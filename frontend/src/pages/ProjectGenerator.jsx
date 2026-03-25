import { useState } from 'react';
import { generateProject, downloadGeneratedProject } from '../api';

export default function ProjectGenerator() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('Code');
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await generateProject(prompt);
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Generation failed. Check your GEMINI_API_KEY and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleDownload = async () => {
        if (!result?.metadata?.id) return;
        try {
            const res = await downloadGeneratedProject(result.metadata.id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${result.metadata.project_name || 'project'}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Download failed');
        }
    };

    const handleCopy = () => {
        const code = getDisplayCode();
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Flatten the structure dict into displayable code
    const getDisplayCode = () => {
        if (!result?.structure) return '';
        const flatten = (obj, prefix = '') => {
            let out = '';
            for (const [key, val] of Object.entries(obj)) {
                if (typeof val === 'string') {
                    out += `# ──── ${prefix}${key} ────\n${val}\n\n`;
                } else if (typeof val === 'object') {
                    out += flatten(val, `${prefix}${key}/`);
                }
            }
            return out;
        };
        return flatten(result.structure);
    };

    const getFileTree = () => {
        if (!result?.structure) return [];
        const files = [];
        const walk = (obj, prefix = '') => {
            for (const [key, val] of Object.entries(obj)) {
                if (typeof val === 'string') {
                    files.push({ name: `${prefix}${key}`, lines: val.split('\n').length });
                } else {
                    files.push({ name: `${prefix}${key}/`, isDir: true });
                    walk(val, `${prefix}${key}/`);
                }
            }
        };
        walk(result.structure);
        return files;
    };

    const renderTabContent = () => {
        if (!result) return null;

        if (activeTab === 'Code') {
            const code = getDisplayCode();
            const lines = code.split('\n');
            return (
                <div style={{ display: 'flex', width: '100%' }}>
                    <div style={{ padding: '0 1rem', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.6, userSelect: 'none', minWidth: '3rem' }}>
                        {lines.map((_, i) => <div key={i}>{String(i + 1).padStart(3, ' ')}</div>)}
                    </div>
                    <pre style={{ margin: 0, color: '#E0C3FC', fontFamily: 'monospace', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}>
                        {code}
                    </pre>
                </div>
            );
        }

        if (activeTab === 'Structure') {
            const files = getFileTree();
            return (
                <div style={{ padding: '1rem 1.5rem' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1rem' }}>
                        📁 {result.metadata?.project_name || 'Project'} — {result.metadata?.file_count || '?'} files
                    </h3>
                    {files.map((f, i) => (
                        <div key={i} style={{ padding: '0.4rem 0', fontFamily: 'monospace', fontSize: '0.85rem', color: f.isDir ? '#D4B6FF' : 'var(--text-secondary)', display: 'flex', gap: '0.75rem' }}>
                            <span>{f.isDir ? '📂' : '📄'}</span>
                            <span>{f.name}</span>
                            {f.lines && <span style={{ color: 'var(--text-muted)' }}>({f.lines} lines)</span>}
                        </div>
                    ))}
                </div>
            );
        }

        if (activeTab === 'Explanation') {
            return (
                <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>About this project</h3>
                    <p><strong>Name:</strong> {result.metadata?.project_name}</p>
                    <p><strong>Files Generated:</strong> {result.metadata?.file_count}</p>
                    <p><strong>Prompt:</strong> {result.metadata?.user_prompt}</p>
                    <p style={{ marginTop: '1rem' }}>This project was generated by the AI engine based on your prompt. Download the ZIP to get started, or copy individual files from the Code tab.</p>
                </div>
            );
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: '1400px', display: 'flex', gap: '2rem', height: 'calc(100vh - 120px)' }}>

            {/* Left Panel */}
            <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>AI Project Generator</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Describe your desired application and let the AI engine generate the entire project structure with runnable code.
                    </p>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., Create a customer churn prediction pipeline with data preprocessing, model training, evaluation, and a Flask API for serving predictions..."
                            style={{ flex: 1, width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1rem', resize: 'none', outline: 'none', lineHeight: 1.6 }}
                        />
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', color: '#EF5350', fontSize: '0.85rem' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !prompt.trim()}
                        style={{
                            width: '100%', padding: '1rem',
                            background: loading ? 'var(--bg-elevated)' : 'var(--bg-card-solid)',
                            border: '1px solid rgba(157, 114, 255, 0.5)',
                            borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)',
                            fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.05em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            cursor: loading ? 'wait' : 'pointer',
                            boxShadow: '0 0 25px rgba(157, 114, 255, 0.2)', transition: 'all 0.3s',
                            opacity: !prompt.trim() ? 0.5 : 1
                        }}
                    >
                        {loading ? '⏳ GENERATING (this may take ~30s)...' : '✨ GENERATE PROJECT'}
                    </button>
                </div>
            </div>

            {/* Right Panel - Code Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        {['Code', 'Structure', 'Explanation'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '0.4rem 1.25rem',
                                    background: activeTab === tab ? 'var(--bg-elevated)' : 'transparent',
                                    border: 'none', borderRadius: 'var(--radius-sm)',
                                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontSize: '0.85rem', fontWeight: activeTab === tab ? 600 : 500,
                                    cursor: 'pointer'
                                }}
                            >{tab}</button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={handleCopy} disabled={!result} style={{ padding: '0.4rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: result ? 1 : 0.4 }}>
                            {copied ? '✅ Copied!' : '📋 Copy'}
                        </button>
                        <button onClick={handleDownload} disabled={!result} style={{ padding: '0.4rem 1rem', background: result ? 'var(--primary)' : 'var(--bg-elevated)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: result ? 'pointer' : 'not-allowed', boxShadow: result ? '0 4px 15px rgba(157, 114, 255, 0.4)' : 'none', opacity: result ? 1 : 0.4 }}>
                            ⬇ Download ZIP
                        </button>
                    </div>
                </div>

                {/* Editor Surface */}
                <div style={{ flex: 1, background: '#0D0E12', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF5350' }}></div>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFA726' }}></div>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#66BB6A' }}></div>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {result?.metadata?.project_name ? `${result.metadata.project_name}/` : 'awaiting generation...'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {result ? `${result.metadata?.file_count || '?'} files` : ''}
                        </div>
                    </div>

                    <div style={{ flex: 1, padding: '1rem 0', overflowY: 'auto', display: 'flex' }}>
                        {loading ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                                <div className="spinner" style={{ width: 32, height: 32 }}></div>
                                <span>AI is generating your project architecture...</span>
                                <span style={{ fontSize: '0.8rem' }}>This typically takes 15–60 seconds</span>
                            </div>
                        ) : !result ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2rem' }}>✨</span>
                                <span>Enter a prompt and click Generate to create a project</span>
                            </div>
                        ) : (
                            <div style={{ width: '100%' }}>
                                {renderTabContent()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0.5rem 0', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: loading ? '#FFA726' : 'var(--text-primary)' }}>
                        <div style={{ width: 8, height: 8, background: loading ? '#FFA726' : 'var(--primary)', borderRadius: '50%' }}></div>
                        {loading ? 'Generating...' : 'Ready'}
                    </div>
                    {result?.metadata?.id && <div>PROJECT: {result.metadata.id.slice(0, 8)}</div>}
                </div>
            </div>
        </div>
    );
}
