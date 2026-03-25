import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser } from '../api';

export default function Login() {
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let res;
            if (isRegister) {
                if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
                res = await registerUser({ name, email, password });
            } else {
                res = await loginUser({ email, password });
            }
            localStorage.setItem('user', JSON.stringify(res.data));
            navigate('/dashboard');
        } catch (e) {
            setError(e.response?.data?.detail || 'Authentication failed');
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%', margin: '-2rem', marginTop: 0, fontFamily: 'Inter, sans-serif' }}>
            
            {/* Left Panel - Branding */}
            <div style={{ 
                flex: 1, 
                backgroundColor: '#16111f',
                backgroundImage: `
                    radial-gradient(circle at 70% 30%, rgba(157,114,255,0.15) 0%, transparent 40%),
                    radial-gradient(circle at 30% 80%, rgba(78,205,196,0.1) 0%, transparent 40%)
                `,
                position: 'relative', 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '4rem 5rem',
                borderRight: '1px solid #231f2b' 
            }}>
                {/* CSS Network Dots Overlay */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px', zIndex: 0 }}></div>
                
                <div style={{ position: 'relative', zIndex: 1, maxWidth: 540 }}>
                    <div style={{ background: 'rgba(255,255,255,0.1)', display: 'inline-block', padding: '0.4rem 0.8rem', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#c4b5fd', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                        Neural Architect V4.0
                    </div>
                    
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                        Architecting the<br/>
                        <span style={{ color: '#dcfce7', background: 'linear-gradient(90deg, #d8b4fe, #fbcfe8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>future of intelligence.</span>
                    </h1>
                    
                    <p style={{ color: '#9ca3af', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '3.5rem' }}>
                        Scale your machine learning operations with SOMA.AI.<br/>Automated neural architecture search and deployment at<br/>the speed of thought.
                    </p>

                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <div style={{ background: '#22202a', border: '1px solid #2d2a36', padding: '1.5rem', borderRadius: '12px', flex: 1 }}>
                            <div style={{ color: '#d8b4fe', fontSize: '1.25rem', marginBottom: '0.75rem' }}>✨</div>
                            <h4 style={{ color: '#f3f4f6', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Auto-Discovery</h4>
                        </div>
                        <div style={{ background: '#22202a', border: '1px solid #2d2a36', padding: '1.5rem', borderRadius: '12px', flex: 1 }}>
                            <div style={{ color: '#d8b4fe', fontSize: '1.25rem', marginBottom: '0.75rem' }}>🎛️</div>
                            <h4 style={{ color: '#f3f4f6', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>Neural Fabric</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div style={{ 
                flex: 1, 
                background: '#121212', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '4rem'
            }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                            {isRegister ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>
                            {isRegister ? 'Enter your details to register.' : 'Access your workspace and model deployments.'}
                        </p>
                    </div>

                    {error && (
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {isRegister && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ color: '#d4d4d8', fontSize: '0.8rem', fontWeight: 500 }}>Full Name</label>
                                <input
                                    type="text" 
                                    style={{ width: '100%', padding: '0.85rem 1rem', background: '#1c1c21', border: '1px solid #27272a', borderRadius: '8px', color: 'white', fontSize: '0.9rem', outline: 'none' }} 
                                    placeholder="Alex Rivera"
                                    value={name} onChange={e => setName(e.target.value)} required
                                />
                            </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ color: '#d4d4d8', fontSize: '0.8rem', fontWeight: 500 }}>Email address</label>
                            <input
                                type="email" 
                                style={{ width: '100%', padding: '0.85rem 1rem', background: '#1c1c21', border: '1px solid #27272a', borderRadius: '8px', color: 'white', fontSize: '0.9rem', outline: 'none' }} 
                                placeholder="name@company.ai"
                                value={email} onChange={e => setEmail(e.target.value)} required
                            />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ color: '#d4d4d8', fontSize: '0.8rem', fontWeight: 500 }}>Password</label>
                                {!isRegister && <span style={{ color: '#a78bfa', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>Forgot password?</span>}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="password" 
                                    style={{ width: '100%', padding: '0.85rem 1rem', background: '#1c1c21', border: '1px solid #27272a', borderRadius: '8px', color: 'white', fontSize: '0.9rem', letterSpacing: '0.2em', outline: 'none' }} 
                                    placeholder="••••••••"
                                    value={password} onChange={e => setPassword(e.target.value)} required
                                />
                                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a', cursor: 'pointer', fontSize: '1rem' }}>👁</span>
                            </div>
                        </div>

                        {!isRegister && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <input type="checkbox" id="remember" style={{ accentColor: '#a78bfa', background: '#1c1c21', border: '1px solid #27272a', width: 14, height: 14, borderRadius: 3, cursor: 'pointer' }} />
                                <label htmlFor="remember" style={{ color: '#a1a1aa', fontSize: '0.8rem', cursor: 'pointer' }}>Remember this session</label>
                            </div>
                        )}

                        <button type="submit" style={{ 
                            width: '100%', 
                            padding: '0.9rem', 
                            background: '#d8b4fe', 
                            border: 'none', 
                            borderRadius: '8px', 
                            color: '#1e1b4b', 
                            fontSize: '0.9rem', 
                            fontWeight: 700,
                            marginTop: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }} disabled={loading}>
                            {loading ? <div className="spinner" style={{ width: 16, height: 16, border: '2px solid #1e1b4b', borderTopColor: 'transparent', margin: 0 }}></div> : isRegister ? 'Create Account' : 'Login to Dashboard'}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '2rem 0', gap: '1rem' }}>
                        <div style={{ flex: 1, height: 1, background: '#27272a' }}></div>
                        <span style={{ color: '#71717a', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em' }}>OR CONTINUE WITH</span>
                        <div style={{ flex: 1, height: 1, background: '#27272a' }}></div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                        <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#1c1c21', border: '1px solid #27272a', padding: '0.75rem', borderRadius: '8px', color: '#e4e4e7', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            Google
                        </button>
                        <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#1c1c21', border: '1px solid #27272a', padding: '0.75rem', borderRadius: '8px', color: '#e4e4e7', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                            Github
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>
                            {isRegister ? 'Already have an account?' : "Don't have an account?"}
                        </span>
                        <button
                            onClick={() => { setIsRegister(!isRegister); setError(''); }}
                            style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', marginLeft: '0.5rem' }}
                        >
                            {isRegister ? 'Sign In' : 'Register'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', color: '#71717a', fontSize: '0.7rem' }}>
                        <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#a1a1aa'} onMouseOut={e=>e.target.style.color='#71717a'}>Privacy Policy</span>
                        <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#a1a1aa'} onMouseOut={e=>e.target.style.color='#71717a'}>Terms of Service</span>
                        <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e=>e.target.style.color='#a1a1aa'} onMouseOut={e=>e.target.style.color='#71717a'}>Help Center</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
