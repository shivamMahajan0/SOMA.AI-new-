import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startResearch, getResearchProject, chatWithResearch } from '../api';
import './Research.css';

const ResearchAgent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Form state
    const [topic, setTopic] = useState('');
    const [url, setUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [file, setFile] = useState(null);
    
    // UI state
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'planning', 'searching', 'extracting', 'summarizing', 'completed', 'failed'
    const [activeTab, setActiveTab] = useState('report');
    
    // Data state
    const [project, setProject] = useState(null);
    const [sources, setSources] = useState([]);
    
    // Chat state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Initial Load
    useEffect(() => {
        if (id) {
            fetchProject(id);
        }
    }, [id]);

    const fetchProject = async (projectId) => {
        try {
            setLoading(true);
            const res = await getResearchProject(projectId);
            setProject(res.data.project);
            setSources(res.data.sources);
            setStatus(res.data.project.status);
        } catch (error) {
            console.error(error);
            alert("Failed to load project");
            navigate('/research/dashboard');
        } finally {
            setLoading(false);
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleStartResearch = async (e) => {
        e.preventDefault();
        if (!topic && !url && !file && !youtubeUrl) {
            alert('Please provide at least one input to start researching.');
            return;
        }

        const formData = new FormData();
        formData.append('topic', topic || 'General Research');
        if (url) formData.append('url', url);
        if (youtubeUrl) formData.append('youtube_url', youtubeUrl);
        if (file) formData.append('file', file);

        try {
            setLoading(true);
            setStatus('planning');
            // Mock interval to simulate progress updates for the UI while the long request runs
            let progressInterval = setInterval(() => {
                setStatus(prev => {
                    if (prev === 'planning') return 'searching';
                    if (prev === 'searching') return 'extracting';
                    if (prev === 'extracting') return 'summarizing';
                    return prev;
                });
            }, 6000);

            const res = await startResearch(formData);
            clearInterval(progressInterval);
            
            if (res.data.status === 'failed') {
                alert('Research failed to complete. Please check the logs.');
                setStatus('failed');
            } else {
                navigate(`/research/${res.data.id}`);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to start research');
            setStatus('failed');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !project) return;

        const userMsg = { role: 'user', content: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await chatWithResearch(project.id, userMsg.content);
            const botMsg = { role: 'assistant', content: res.data.response };
            setChatMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg = { role: 'assistant', content: "Sorry, I couldn't connect to the research data. Please try again." };
            setChatMessages(prev => [...prev, errorMsg]);
        } finally {
            setChatLoading(false);
        }
    };

    // Progress Bar UI logic
    const steps = ['planning', 'searching', 'extracting', 'summarizing', 'completed'];
    const currentStepIndex = steps.indexOf(status);

    const renderProgressBar = () => (
        <div className="research-progress-wrapper">
            <h2 className="rp-title">Research in Progress</h2>
            <div className="rp-steps">
                {steps.map((step, idx) => (
                    <div key={step} className={`rp-step ${idx <= currentStepIndex ? 'active' : ''} ${step === status ? 'pulse' : ''}`}>
                        <div className="rp-step-icon">
                            {idx < currentStepIndex ? '✓' : (idx + 1)}
                        </div>
                        <div className="rp-step-label">{step.charAt(0).toUpperCase() + step.slice(1)}</div>
                        {idx < steps.length - 1 && <div className="rp-step-line"></div>}
                    </div>
                ))}
            </div>
            {status === 'failed' && <div className="rp-error">Pipeline Failed. Please try again.</div>}
        </div>
    );

    const renderInputForm = () => (
        <div className="research-form-container">
            <h1 className="rf-header">Start New Research</h1>
            <p className="rf-subheader">Define your topic and provide sources to build a comprehensive knowledge base.</p>
            
            <form onSubmit={handleStartResearch} className="rf-form">
                <div className="rf-group">
                    <label>Research Topic / Prompt <span>*</span></label>
                    <textarea 
                        placeholder="e.g. Find the latest breakthroughs in solid-state batteries and their market impact..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        required
                        className="rf-input-large"
                    />
                </div>
                
                <div className="rf-group-row">
                    <div className="rf-group">
                        <label>Web URL</label>
                        <input type="url" placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} className="rf-input"/>
                    </div>
                    <div className="rf-group">
                        <label>YouTube Link</label>
                        <input type="url" placeholder="https://youtube.com/watch?v=..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="rf-input" />
                    </div>
                </div>

                <div className="rf-group">
                    <label>Upload Document (PDF, DOCX)</label>
                    <div className="rf-file-drop">
                        <input type="file" onChange={handleFileChange} id="research-file" className="rf-file-input" />
                        <label htmlFor="research-file" className="rf-file-label">
                            {file ? file.name : "Drag & Drop or Click to Upload"}
                        </label>
                    </div>
                </div>

                <button type="submit" className="rf-submit-btn" disabled={loading}>
                    {loading ? "Initializing Run..." : "Execute Research Pipeline"}
                </button>
            </form>
        </div>
    );

    const renderWorkspace = () => (
        <div className="research-workspace">
            <div className="rw-header">
                <h2>{project.title}</h2>
                <div className="rw-badges">
                    <span className="rw-badge blue">Sources: {project.sources_count}</span>
                    <span className="rw-badge green">Completed</span>
                </div>
            </div>

            <div className="rw-layout">
                {/* Main Content Area */}
                <div className="rw-main">
                    <div className="rw-tabs">
                        <button className={`rw-tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>Final Report</button>
                        <button className={`rw-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Quick Summary & Notes</button>
                        <button className={`rw-tab ${activeTab === 'sources' ? 'active' : ''}`} onClick={() => setActiveTab('sources')}>Sources List</button>
                    </div>

                    <div className="rw-tab-content">
                        {activeTab === 'report' && (
                            <div className="rt-report markdown-body">
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                                    <h3 style={{margin: 0}}>Comprehensive Report</h3>
                                    <button 
                                        className="rd-primary-btn" 
                                        style={{padding: '0.6rem 1rem', fontSize: '0.9rem'}}
                                        onClick={() => {
                                            const element = document.createElement('a');
                                            const file = new Blob([project.final_report], {type: 'text/markdown'});
                                            element.href = URL.createObjectURL(file);
                                            element.download = `${project.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.md`;
                                            document.body.appendChild(element);
                                            element.click();
                                            document.body.removeChild(element);
                                        }}
                                    >⬇️ Download Report</button>
                                </div>
                                <div dangerouslySetInnerHTML={{ __html: project.final_report?.replace(/\n/g, '<br/>') || 'No report generated.' }} />
                            </div>
                        )}
                        {activeTab === 'summary' && (
                            <div className="rt-summary">
                                <h3>Short Summary</h3>
                                <p className="rt-short-desc">{project.short_summary}</p>
                                
                                <h3>Key Points</h3>
                                <ul className="rt-keypoints">
                                    {(project.key_points || []).map((kp, i) => <li key={i}>{kp}</li>)}
                                </ul>

                                <h3>Extracted Notes</h3>
                                <div className="rt-notes" dangerouslySetInnerHTML={{ __html: project.notes?.replace(/\n/g, '<br/>') || '' }} />
                            </div>
                        )}
                        {activeTab === 'sources' && (
                            <div className="rt-sources">
                                <h3>Gathered Sources ({sources.length})</h3>
                                <div className="rs-grid">
                                    {sources.map(s => (
                                        <div key={s.id} className="rs-item">
                                            <span className="rs-type">{s.source_type.toUpperCase()}</span>
                                            <a href={s.source_url} target="_blank" rel="noreferrer" className="rs-name">{s.source_name}</a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Copilot RAG Sidebar */}
                <div className="rw-sidebar">
                    <div className="rw-chat-header">
                        <h3>Research Copilot</h3>
                        <span>Query Project Data</span>
                    </div>
                    
                    <div className="rw-chat-history">
                        {chatMessages.length === 0 && (
                            <div className="rw-chat-empty">
                                Ask me anything about the gathered research. I have analyzed all sources.
                            </div>
                        )}
                        {chatMessages.map((msg, i) => (
                            <div key={i} className={`rw-chat-bubble ${msg.role}`}>
                                <div dangerouslySetInnerHTML={{ __html: msg.content?.replace(/\n/g, '<br/>') }} />
                            </div>
                        ))}
                        {chatLoading && <div className="rw-chat-bubble assistant pending">Analyzing context...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleChat} className="rw-chat-input-area">
                        <input 
                            type="text" 
                            placeholder="Ask a question..." 
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            disabled={chatLoading}
                        />
                        <button type="submit" disabled={!chatInput.trim() || chatLoading}>Send</button>
                    </form>
                </div>
            </div>
        </div>
    );

    return (
        <div className="research-agent-page">
            <button className="ra-back-btn" onClick={() => navigate('/research/dashboard')}>← Back to Dashboard</button>
            <div className="ra-content">
                {!project && !loading && !status && renderInputForm()}
                {(loading || (status && status !== 'completed' && status !== 'failed')) && renderProgressBar()}
                {project && status === 'completed' && renderWorkspace()}
            </div>
        </div>
    );
};

export default ResearchAgent;
