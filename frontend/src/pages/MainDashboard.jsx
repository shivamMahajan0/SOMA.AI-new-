import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, []);

    const cards = [
        {
            title: 'SOMA.AI Builder',
            desc: 'Generate, train, and deploy ready-to-use machine learning models directly from your datasets without writing code.',
            icon: '⚡',
            path: '/new',
            glow: 'rgba(212,182,255,0.4)',
            color: '#D4B6FF'
        },
        {
            title: 'AI App Generator',
            desc: 'Describe an AI application in plain text and watch the system generate the entire React+Python architecture.',
            icon: '✨',
            path: '/ai-project-generator',
            glow: 'rgba(255,182,193,0.4)',
            color: '#FFB6C1'
        },
        {
            title: 'Content Summarizer',
            desc: 'Turn long-form content (PDF, Web, Docs, YouTube) into perfectly structured, insightful summaries using AI.',
            icon: '🧠',
            path: '/summarizer/new',
            glow: 'rgba(78,205,196,0.4)',
            color: '#4ECDC4'
        },
        {
            title: 'Document Intelligence',
            desc: 'Upload static PDF documents and seamlessly convert them into dynamic video presentations with AI summaries.',
            icon: '📄',
            path: '/pdf-video/new',
            glow: 'rgba(239,83,80,0.4)',
            color: '#EF5350'
        },
        {
            title: 'Research Agent',
            desc: 'Multi-step AI research system. Orchestrate deep dives into web links, PDFs, and YouTube videos to generate comprehensive reports.',
            icon: '🔍',
            path: '/research/dashboard',
            glow: 'rgba(59, 130, 246, 0.4)',
            color: '#60A5FA'
        }
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    Welcome back, {user?.name || 'Explorer'}
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.3rem 0.8rem', background: 'rgba(78,205,196,0.1)', color: '#4ECDC4', border: '1px solid rgba(78,205,196,0.3)', borderRadius: '20px', letterSpacing: '0.05em' }}>
                        SYSTEM ONLINE
                    </span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem' }}>
                    Select a pipeline below to initiate a new workload.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                {cards.map((card, i) => (
                    <div 
                        key={i}
                        onClick={() => navigate(card.path)}
                        style={{ 
                            background: 'var(--bg-card)', 
                            border: '1px solid var(--border)', 
                            borderRadius: 'var(--radius-xl)', 
                            padding: '2.5rem 2rem', 
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = card.color;
                            e.currentTarget.style.boxShadow = `0 10px 30px ${card.glow}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {/* Interactive Background Gradient */}
                        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: card.glow, filter: 'blur(60px)', opacity: 0.5, borderRadius: '50%' }}></div>
                        
                        <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: `1px solid ${card.color}40`, color: card.color }}>
                            {card.icon}
                        </div>
                        
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.5rem 0 1rem 0' }}>{card.title}</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                                {card.desc}
                            </p>
                        </div>
                        
                        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: card.color, fontWeight: 600, fontSize: '0.9rem' }}>
                            LAUNCH PIPELINE <span>→</span>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Quick Stats / Recent Activity Mini section */}
            <div style={{ marginTop: '4rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Active Infrastructure</h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>2 models deployed, 1 GPU instance running.</p>
                </div>
                <button 
                    onClick={() => navigate('/profile')}
                    style={{ background: 'transparent', color: '#D4B6FF', border: '1px solid rgba(212,182,255,0.3)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                    VIEW SYSTEM METRICS
                </button>
            </div>
        </div>
    );
}
