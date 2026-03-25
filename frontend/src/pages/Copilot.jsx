import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sendChat, getChatHistory } from '../api';

export default function Copilot() {
    const { id } = useParams();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const messagesEnd = useRef(null);

    const hasProject = id && id !== 'undefined' && id !== 'copilot';
    const isGeneral = !hasProject;

    // Load real chat history on mount if project-specific, else load local history
    useEffect(() => {
        if (!hasProject) {
            const stored = localStorage.getItem('general_copilot_history');
            if (stored) {
                try {
                    setMessages(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to parse general copilot history");
                }
            }
            return;
        }
        setHistoryLoading(true);
        getChatHistory(id)
            .then(res => {
                setMessages((res.data || []).map(m => ({ role: m.role, content: m.content })));
                setHistoryLoading(false);
            })
            .catch(() => setHistoryLoading(false));
    }, [id, hasProject]);

    // Save general history to localStorage
    useEffect(() => {
        if (isGeneral && messages.length > 0) {
            localStorage.setItem('general_copilot_history', JSON.stringify(messages));
        }
    }, [messages, isGeneral]);

    useEffect(() => {
        messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const msg = input.trim();
        setInput('');

        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setLoading(true);

        if (isGeneral) {
            // General copilot — provide platform help without backend API
            const generalResponse = getGeneralResponse(msg);
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'assistant', content: generalResponse }]);
                setLoading(false);
            }, 600);
        } else {
            // Project copilot — uses real Gemini API with dataset context
            try {
                const res = await sendChat(id, msg);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: res.data.response
                }]);
            } catch (err) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠️ ${err.response?.data?.detail || 'Failed to get a response. Make sure your GEMINI_API_KEY is configured.'}`
                }]);
            }
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: 1400, display: 'flex', gap: '2rem', height: 'calc(100vh - 80px)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                                {isGeneral ? 'SOMA.AI Assistant' : 'AI Dataset Copilot'}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(78,205,196,0.1)', color: 'var(--accent-cyan)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
                                {isGeneral ? 'General Mode' : 'Project Mode'}
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                            {isGeneral
                                ? 'Ask me anything about SOMA.AI — features, workflows, how to train models, etc.'
                                : 'Ask questions about your dataset, model results, or get optimization advice.'}
                        </p>
                    </div>
                    {hasProject && (
                        <div className="copilot-header-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <Link to={`/project/${id}/reports`} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none' }}>📊 Report</Link>
                            <Link to={`/project/${id}/code`} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none' }}>💻 Code</Link>
                            <Link to={`/project/${id}/predict`} style={{ padding: '0.4rem 0.8rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none' }}>🎯 Predict</Link>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {historyLoading ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 1rem' }} />
                                Loading chat history...
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isGeneral ? '✨' : '🧠'}</div>
                                <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                                    {isGeneral ? 'Welcome to SOMA.AI Assistant' : 'Start a Conversation'}
                                </h3>
                                <p>{isGeneral ? 'Ask me about the platform — how to create projects, train models, view reports, and more.' : 'Ask about your dataset, model performance, or request optimization suggestions.'}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                                    {(isGeneral
                                        ? ['How do I create a project?', 'What models does SOMA.AI support?', 'How do I deploy a model?', 'Explain the training pipeline']
                                        : ['Summarize the dataset', 'Which features matter most?', 'How can I improve accuracy?', 'Explain the model results']
                                    ).map(q => (
                                        <button key={q} onClick={() => setInput(q)} style={{ padding: '0.5rem 1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '2rem', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>{q}</button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} style={{ display: 'flex', gap: '1rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: msg.role === 'user' ? 'var(--bg-elevated)' : 'linear-gradient(135deg, #6C63FF, #FF6B9D)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: msg.role === 'user' ? '1px solid var(--border)' : 'none', color: '#fff', fontSize: '1.2rem' }}>
                                        {msg.role === 'user' ? 'U' : '🤖'}
                                    </div>
                                    <div style={{ maxWidth: '80%', background: msg.role === 'user' ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.03)', border: msg.role === 'user' ? '1px solid var(--border)' : '1px solid rgba(157,114,255,0.2)', borderRadius: '1rem', borderTopRightRadius: msg.role === 'user' ? '0' : '1rem', borderTopLeftRadius: msg.role === 'assistant' ? '0' : '1rem', padding: '1.25rem', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #FF6B9D)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>🤖</div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '1rem', borderTopLeftRadius: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{isGeneral ? 'Thinking...' : 'Analyzing your data...'}</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEnd} />
                    </div>
                </div>

                {/* Input — ALWAYS enabled */}
                <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 0.5rem 0.5rem 1.5rem' }}>
                        <input
                            type="text"
                            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.95rem', outline: 'none' }}
                            placeholder={isGeneral ? "Ask anything about SOMA.AI..." : "Ask about your dataset, model, or results..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={loading}
                        />
                        <button
                            className="btn btn-primary"
                            style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)' }}
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// General mode responses about the platform
function getGeneralResponse(question) {
    const q = question.toLowerCase();

    if (q.includes('create') && q.includes('project'))
        return `To create a project:\n\n1. Click "New Project" or navigate to /new\n2. Enter a project name\n3. Upload your CSV dataset\n4. Select the target column\n5. Click "Start Training"\n\nSOMA.AI will automatically profile your data, preprocess it, train multiple models, and select the best one.`;

    if (q.includes('model') && (q.includes('support') || q.includes('available')))
        return `SOMA.AI supports the following models:\n\n• Random Forest\n• Gradient Boosting\n• XGBoost\n• LightGBM\n• Logistic Regression / Ridge / Lasso\n• KNN (K-Nearest Neighbors)\n• SVM / SVR\n• Decision Tree\n\nAll models are automatically tuned and compared during training.`;

    if (q.includes('deploy'))
        return `After training completes, you can deploy your model:\n\n1. Go to the project dashboard\n2. Click "Make Predictions" for interactive predictions\n3. Use the Downloads tab to export the trained model (.pkl)\n4. Use the generated code (Code tab) to integrate into your own pipeline\n\nThe platform generates a complete reproducible Python script with preprocessing and inference code.`;

    if (q.includes('train') && q.includes('pipeline'))
        return `The SOMA.AI training pipeline:\n\n1. **Profiling** — Analyzes data types, missing values, distributions, correlations\n2. **Preprocessing** — Handles missing values, encodes categories, scales features\n3. **Training** — Trains multiple ML models with cross-validation\n4. **Evaluating** — Compares models using accuracy/F1/R²/RMSE metrics\n5. **Explaining** — Generates SHAP values and feature importance\n\nThe entire process is automated and typically completes in under 60 seconds.`;

    if (q.includes('report'))
        return `After training, you can view reports from:\n\n• The Dashboard → "View Report" button\n• The sidebar → "All Reports" (lists all completed projects)\n• Each project's "Downloads" tab has a PDF export\n\nReports include metrics, confusion matrix, feature importance, model comparison, and AI-generated insights.`;

    if (q.includes('document') || q.includes('pdf'))
        return `SOMA.AI supports PDF document intelligence:\n\n1. Upload a PDF via the "Documents" section\n2. The system extracts text, tables, and key metrics\n3. Charts are auto-generated from table data\n4. You can chat with the document using AI\n\nAccess uploaded documents from the sidebar → "Documents".`;

    return `I'm the SOMA.AI Assistant! I can help you with:\n\n• **Creating projects** — Upload CSV datasets and train ML models\n• **Understanding results** — View reports, metrics, and feature importance\n• **Generated code** — Get reproducible Python scripts for your pipeline\n• **Document intelligence** — Upload PDFs and chat with them\n• **AI Project Generator** — Generate complete project structures\n\nWhat would you like to know more about?`;
}
