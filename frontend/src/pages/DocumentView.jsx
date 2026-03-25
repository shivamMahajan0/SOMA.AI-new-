import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument, chatWithDocument, getDocumentChatHistory, deleteDocument } from '../api';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import ReactMarkdown from 'react-markdown';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function DocumentView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    useEffect(() => {
        loadDocument();
        loadChatHistory();
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const loadDocument = async () => {
        try {
            const res = await getDocument(id);
            setDoc(res.data);
        } catch (e) {
            console.error('Failed to load document', e);
        }
        setLoading(false);
    };

    const loadChatHistory = async () => {
        try {
            const res = await getDocumentChatHistory(id);
            setChatMessages(res.data || []);
        } catch (e) {
            console.error('Failed to load chat history', e);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const msg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
        setChatLoading(true);
        try {
            const res = await chatWithDocument(id, msg);
            setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Failed to get response.' }]);
        }
        setChatLoading(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Delete this document?')) {
            await deleteDocument(id);
            navigate('/');
        }
    };

    if (loading) return <div className="page-container"><p>Loading document...</p></div>;
    if (!doc) return <div className="page-container"><p>Document not found.</p></div>;

    const tabs = [
        { key: 'overview', label: '📋 Overview' },
        { key: 'tables', label: `📊 Tables (${doc.tables?.length || 0})` },
        { key: 'charts', label: `📈 Charts (${doc.charts?.length || 0})` },
        { key: 'chat', label: '💬 Chat' },
        { key: 'text', label: '📄 Full Text' },
    ];

    return (
        <div className="page-container">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>📄 {doc.name}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{doc.filename} · {doc.page_count} pages</p>
                </div>
                <button className="btn btn-sm" style={{ background: 'rgba(239,83,80,0.15)', color: 'var(--accent-red)' }} onClick={handleDelete}>
                    🗑️ Delete
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            background: activeTab === tab.key ? 'var(--accent-purple)' : 'var(--bg-subtle)',
                            border: activeTab === tab.key ? 'none' : '1px solid var(--border-subtle)',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div>
                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{doc.page_count}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pages</p>
                        </div>
                        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{doc.tables?.length || 0}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tables Found</p>
                        </div>
                        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-green)' }}>{doc.charts?.length || 0}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Charts Generated</p>
                        </div>
                        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-yellow)' }}>{doc.key_metrics?.length || 0}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Key Metrics</p>
                        </div>
                    </div>

                    {/* AI Summary */}
                    {doc.ai_summary && (
                        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.75rem' }}>🤖 AI Summary</h3>
                            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <ReactMarkdown>{doc.ai_summary}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Key Metrics */}
                    {doc.key_metrics && doc.key_metrics.length > 0 && (
                        <div className="card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.75rem' }}>📊 Key Metrics Detected</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                {doc.key_metrics.slice(0, 12).map((m, i) => (
                                    <div key={i} style={{
                                        padding: '0.75rem', background: 'rgba(108,99,255,0.08)',
                                        borderRadius: 'var(--radius-sm)', border: '1px solid rgba(108,99,255,0.15)',
                                    }}>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.label}</p>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                            {m.value.toLocaleString()}{m.unit ? ` ${m.unit}` : ''}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tables Tab */}
            {activeTab === 'tables' && (
                <div>
                    {doc.tables && doc.tables.length > 0 ? (
                        doc.tables.map((table, idx) => (
                            <div key={idx} className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
                                <h3 style={{ marginBottom: '0.75rem' }}>Table {idx + 1} (Page {table.page})</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr>
                                                {table.headers.map((h, i) => (
                                                    <th key={i} style={{
                                                        padding: '0.6rem 0.75rem', textAlign: 'left',
                                                        background: 'rgba(108,99,255,0.15)', borderBottom: '2px solid rgba(108,99,255,0.3)',
                                                        fontWeight: 600, whiteSpace: 'nowrap',
                                                    }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {table.rows.slice(0, 20).map((row, ri) => (
                                                <tr key={ri}>
                                                    {row.map((cell, ci) => (
                                                        <td key={ci} style={{
                                                            padding: '0.5rem 0.75rem',
                                                            borderBottom: '1px solid var(--border-subtle)',
                                                        }}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Showing {Math.min(20, table.rows.length)} of {table.row_count} rows
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No tables detected in this document.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Charts Tab */}
            {activeTab === 'charts' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
                    {doc.charts && doc.charts.length > 0 ? (
                        doc.charts.map((chart, idx) => (
                            <div key={idx} className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>{chart.title}</h3>
                                <div style={{ height: 280 }}>
                                    {chart.type === 'bar' && <Bar data={chart.data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
                                    {chart.type === 'line' && <Line data={chart.data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />}
                                    {chart.type === 'pie' && <Pie data={chart.data} options={{ responsive: true, maintainAspectRatio: false }} />}
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Source: Page {chart.source_page}</p>
                            </div>
                        ))
                    ) : (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                            <p style={{ color: 'var(--text-secondary)' }}>No charts were generated. This usually means no numeric table data was found.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 500 }}>
                    <h3 style={{ marginBottom: '1rem' }}>💬 Chat with Document</h3>
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', padding: '0.5rem' }}>
                        {chatMessages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                <p>Ask questions about the document. Examples:</p>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    "Summarize the main findings" · "What are the key statistics?" · "Explain the trends"
                                </p>
                            </div>
                        )}
                        {chatMessages.map((msg, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: '0.75rem',
                            }}>
                                <div style={{
                                    maxWidth: '75%', padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    background: msg.role === 'user' ? 'var(--accent-purple)' : 'var(--bg-subtle)',
                                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                                }}>
                                    <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}>
                                <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)' }}>
                                    <p style={{ color: 'var(--text-secondary)' }}>Thinking...</p>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="form-input"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                            placeholder="Ask about this document..."
                            style={{ flex: 1 }}
                        />
                        <button className="btn btn-primary" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
                            Send
                        </button>
                    </div>
                </div>
            )}

            {/* Full Text Tab */}
            {activeTab === 'text' && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>📄 Extracted Text</h3>
                    <div style={{
                        maxHeight: 600, overflowY: 'auto', background: 'var(--bg-elevated)',
                        padding: '1.5rem', borderRadius: 'var(--radius-md)',
                        fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.8,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                        {doc.extracted_text || 'No text extracted.'}
                    </div>
                </div>
            )}
        </div>
    );
}
