import { useNavigate, Link } from 'react-router-dom';

export default function Landing() {
    const navigate = useNavigate();

    const handleStart = () => {
        const user = localStorage.getItem('user');
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div style={{ background: 'var(--bg-primary)' }}>
            {/* HERO SECTION */}
            <section className="landing-hero">
                <div className="landing-badge">
                    <span>✨ SOMA.AI — The Intelligent Platform</span>
                </div>
                <h1 style={{ fontSize: '50px' }}>Your Complete<br/>AI & Logic Studio.</h1>
                <p className="subtitle">
                   SOMA.AI is a unified platform for automated machine learning, intelligent document analysis, fully autonomous research agents, and one-click AI application generation.
                </p>
                
                <div className="landing-buttons">
                    <button onClick={handleStart} className="btn-landing-primary">
                        Enter Workspace
                    </button>
                    <Link to="/login" className="btn-landing-secondary">
                        Sign In
                    </Link>
                </div>
            </section>

            {/* PLATFORM OVERVIEW */}
            <div className="landing-mockup">
                <div className="landing-mockup-header">
                    <div className="mockup-dot r"></div>
                    <div className="mockup-dot y"></div>
                    <div className="mockup-dot g"></div>
                    <div style={{ margin: '0 auto', fontSize: '0.8rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '4px 20px', borderRadius: '4px' }}>
                        soma-ai.platform
                    </div>
                </div>
                <div className="landing-mockup-body" style={{ minHeight: '350px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                     <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 600 }}>Multi-Modal AI Capabilities</h3>
                     <div className="feature-pill-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', maxWidth: '800px' }}>
                         <div className="feature-pill" style={{ background: 'rgba(78, 205, 196, 0.1)', color: 'var(--accent-cyan)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(78, 205, 196, 0.3)' }}>🧠 Automated Machine Learning</div>
                         <div className="feature-pill" style={{ background: 'rgba(157, 114, 255, 0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(157, 114, 255, 0.3)' }}>📄 Smart Document Analysis</div>
                         <div className="feature-pill" style={{ background: 'rgba(255, 107, 157, 0.1)', color: 'var(--accent-pink)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(255, 107, 157, 0.3)' }}>🔬 Autonomous Web Research</div>
                         <div className="feature-pill" style={{ background: 'rgba(255, 167, 38, 0.1)', color: 'var(--accent-orange)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(255, 167, 38, 0.3)' }}>🚀 AI Project Generator</div>
                         <div className="feature-pill" style={{ background: 'rgba(102, 187, 106, 0.1)', color: 'var(--accent-green)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(102, 187, 106, 0.3)' }}>🎬 PDF to Video Creation</div>
                         <div className="feature-pill" style={{ background: 'rgba(239, 83, 80, 0.1)', color: 'var(--accent-red)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid rgba(239, 83, 80, 0.3)' }}>⚡ One-Click REST API Deploy</div>
                     </div>
                </div>
            </div>

            {/* SECURITY SECTION */}
            <section className="security-section">
                <h2>Enterprise Security & Privacy</h2>
                <div className="security-grid">
                    <div className="security-item">
                        <div className="icon">🛡️</div>
                        <h4>Your Data Belongs to You</h4>
                        <p>We do not use your datasets or private documents to train our core foundation models.</p>
                    </div>
                    <div className="security-item">
                        <div className="icon">🔒</div>
                        <h4>Military-Grade Encryption</h4>
                        <p>All structured datasets, generated code, and PDF documents are securely encrypted at rest.</p>
                    </div>
                    <div className="security-item">
                        <div className="icon">🌐</div>
                        <h4>Open LLM Choice</h4>
                        <p>Choose from multiple models via OpenRouter or use local models to enforce strict privacy compliance.</p>
                    </div>
                </div>
            </section>

            {/* PLATFORM CAPABILITIES SECTION */}
            <section className="capabilities-section">
                <div className="capabilities-header">
                    <h2>Four Pillars of SOMA.AI</h2>
                    <p>Everything you need from data preparation to autonomous research generation.</p>
                </div>
                
                <div className="capabilities-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    
                    {/* Pillar 1: AutoML */}
                    <div className="capability-card" style={{ gridColumn: 'span 1' }}>
                        <div className="capability-title" style={{ fontSize: '1.25rem' }}>🤖 Automated Machine Learning</div>
                        <p className="capability-desc">Upload a dataset, pick a target column, and let the engine test XGBoost, Random Forest, and LightGBM instantly.</p>
                        <div className="capability-demo">
                            <div className="demo-leaderboard"><span>🏆 RandomForest</span> <span style={{ color: 'var(--accent-green)' }}>92%</span></div>
                            <div className="progress-bar" style={{ marginBottom: '12px' }}><div className="progress-bar-fill" style={{ width: '92%' }}></div></div>
                            <div className="demo-leaderboard"><span>2. XGBoost</span> <span style={{ color: 'var(--accent-cyan)' }}>90%</span></div>
                            <div className="progress-bar" style={{ marginBottom: '12px' }}><div className="progress-bar-fill" style={{ width: '90%', background: 'var(--accent-cyan)' }}></div></div>
                        </div>
                    </div>

                    {/* Pillar 2: Research */}
                    <div className="capability-card" style={{ gridColumn: 'span 1' }}>
                        <div className="capability-title" style={{ fontSize: '1.25rem', color: 'var(--accent-pink)' }}>🔬 Autonomous Research Agent</div>
                        <p className="capability-desc">Provide a topic. The agent searches the web, extracts source content, evaluates reliability, and drafts comprehensive markdown reports.</p>
                        <div className="capability-demo" style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>Task: Research quantum computing advancements</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--accent-cyan)' }}>✓</span> Searched 5 reliable sources
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--accent-cyan)' }}>✓</span> Drafting final overview document
                            </div>
                        </div>
                    </div>

                    {/* Pillar 3: Project Gen */}
                    <div className="capability-card" style={{ gridColumn: 'span 1' }}>
                        <div className="capability-title" style={{ fontSize: '1.25rem', color: 'var(--accent-orange)' }}>🚀 AI Project Generator</div>
                        <p className="capability-desc">Describe an application. SOMA.AI architects the structure, generates the Python logic, and packages it into a downloadable zip.</p>
                        <div className="capability-demo">
                            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div style={{ color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '8px' }}>app.py</div>
                                <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    from fastapi import FastAPI<br/>
                                    app = FastAPI()<br/>
                                    @app.get("/")<br/>
                                    def root():<br/>
                                    &nbsp;&nbsp;return {'{'} "status": "running" {'}'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pillar 4: Document Analysis */}
                    <div className="capability-card" style={{ gridColumn: 'span 1' }}>
                        <div className="capability-title" style={{ fontSize: '1.25rem', color: 'var(--accent-green)' }}>📄 PDF & Content Summarizer</div>
                        <p className="capability-desc">Upload massive PDFs or provide URL links. The engine extracts the content, summarizes the key points, and lets you chat with the document.</p>
                        <div className="capability-demo" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                            <div style={{ alignSelf: 'flex-end', background: 'var(--primary)', color: 'white', padding: '6px 12px', borderRadius: '12px', borderBottomRightRadius: '2px', marginBottom: '8px', maxWidth: '90%' }}>
                                What is the main conclusion of the Q3 report?
                            </div>
                            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-subtle)', padding: '6px 12px', borderRadius: '12px', borderBottomLeftRadius: '2px', maxWidth: '90%' }}>
                                The Q3 report concludes that operational costs decreased by 12% following the automation initiative.
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* CTA SECTION */}
            <section style={{ textAlign: 'center', padding: '6rem 1rem', background: 'linear-gradient(to bottom, transparent, rgba(157, 114, 255, 0.05))' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Enter the Intelligence Engine</h2>
                <button onClick={handleStart} className="btn-landing-primary">
                    Launch SOMA.AI Workspace
                </button>
            </section>
        </div>
    );
}
