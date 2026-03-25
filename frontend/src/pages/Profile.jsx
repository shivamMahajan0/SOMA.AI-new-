import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, getUserStats, updateUserProfile, listProjects } from '../api';

export default function Profile() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '' });
    const [saveMsg, setSaveMsg] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) { navigate('/login'); return; }
        const u = JSON.parse(stored);
        setUser(u);

        Promise.all([
            getUserProfile(u.id).catch(() => ({ data: null })),
            getUserStats(u.id).catch(() => ({ data: null })),
            listProjects().catch(() => ({ data: [] })),
        ]).then(([profileRes, statsRes, projRes]) => {
            setProfile(profileRes.data || { name: u.name, email: u.email, created_at: '', activities: [] });
            setStats(statsRes.data);
            setProjects(projRes.data || []);
            setLoading(false);
        });
    }, [navigate]);

    const handleEditClick = () => {
        setEditForm({
            name: profile?.name || user?.name || '',
            email: profile?.email || user?.email || '',
        });
        setSaveMsg('');
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        try {
            const res = await updateUserProfile(user.id, editForm);
            const updated = res.data;
            setProfile(prev => ({ ...prev, name: updated.name, email: updated.email }));
            const updatedUser = { ...user, name: updated.name, email: updated.email };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setSaveMsg('Profile updated successfully!');
            setTimeout(() => setIsEditing(false), 1000);
        } catch (err) {
            setSaveMsg(err.response?.data?.detail || 'Failed to update profile');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—';
    const activities = profile?.activities || [];
    const tier = stats?.tier || 'Free';

    const formatNum = (n) => {
        if (!n && n !== 0) return '0';
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toLocaleString();
    };

    const activityIcon = (action) => {
        const map = { 'training': '⚡', 'project_created': '📁', 'login': '🔑', 'prediction': '🎯', 'deploy': '☁️', 'generation': '✨' };
        return map[action] || '📌';
    };

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Breadcrumbs */}
            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                <span style={{ color: 'var(--primary-light)', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>Dashboard</span>
                <span style={{ cursor: 'pointer' }}>Profile</span>
            </div>

            {/* Profile Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, #A8E6CF 0%, #3498db 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white', fontWeight: 700, border: '4px solid var(--bg-primary)' }}>
                            {(profile?.name || user?.name || 'A')[0].toUpperCase()}
                        </div>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{profile?.name || user?.name || '—'}</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.25rem 0 0.75rem 0' }}>@ {profile?.email || user?.email || '—'}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ background: tier === 'Pro' ? 'rgba(212,182,255,0.15)' : 'rgba(255,255,255,0.1)', color: tier === 'Pro' ? '#D4B6FF' : 'white', padding: '0.2rem 0.6rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                                {tier.toUpperCase()} TIER
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Joined {joinedDate}</span>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleEditClick} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Edit Profile</button>
                    <button onClick={() => navigate('/new')} style={{ background: 'linear-gradient(90deg, #D4B6FF 0%, #E0C3FC 100%)', color: '#1A1A2E', border: 'none', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>New Project</button>
                </div>
            </div>

            {/* Dynamic Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📊</div>
                        <span style={{ background: 'rgba(212,182,255,0.15)', color: '#D4B6FF', padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>PROJECTS</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, margin: '0 0 0.25rem 0' }}>Total Projects</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.total_projects ?? 0}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>created</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (stats?.total_projects || 0) * 10)}%`, height: '100%', background: '#D4B6FF' }}></div>
                    </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🧠</div>
                        <span style={{ background: 'rgba(78,205,196,0.15)', color: '#4ECDC4', padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>MODELS</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, margin: '0 0 0.25rem 0' }}>Trained Models</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>{stats?.completed_models ?? 0}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>completed</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (stats?.completed_models || 0) * 20)}%`, height: '100%', background: 'linear-gradient(90deg, #D4B6FF, #4ECDC4)' }}></div>
                    </div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🗄️</div>
                        <span style={{ background: 'rgba(255,182,193,0.15)', color: '#FFB6C1', padding: '0.25rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700 }}>DATA</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, margin: '0 0 0.25rem 0' }}>Rows Processed</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>{formatNum(stats?.total_rows_processed)}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>rows</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (stats?.total_rows_processed || 0) / 100)}%`, height: '100%', background: '#FFB6C1' }}></div>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 3fr)', gap: '4rem' }}>
                
                {/* Left Column - Recent Activity (dynamic) */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Recent Activity</h2>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{activities.length} entries</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activities.length === 0 ? (
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No activity yet. Start by creating a project!
                            </div>
                        ) : (
                            activities.slice(0, 8).map((act, i) => (
                                <div key={act.id || i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {activityIcon(act.action)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0, textTransform: 'capitalize' }}>{(act.action || '').replace(/_/g, ' ')}</h4>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{timeAgo(act.created_at)}</span>
                                        </div>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{act.description}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Projects List */}
                    {projects.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem 0' }}>Your Projects</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {projects.slice(0, 5).map(p => (
                                    <div key={p.id} onClick={() => navigate(`/project/${p.id}`)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{p.name}</h4>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.filename} — {p.num_rows?.toLocaleString() || '?'} rows</span>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: 12, background: p.status === 'completed' ? 'rgba(78,205,196,0.1)' : 'rgba(255,255,255,0.05)', color: p.status === 'completed' ? '#4ECDC4' : 'var(--text-secondary)', textTransform: 'uppercase' }}>{p.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Account Info & Settings */}
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem 0' }}>Account</h2>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💳</div>
                            <div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>CURRENT PLAN</span>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{tier}</h3>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Projects Used</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stats?.total_projects ?? 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Models Trained</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stats?.completed_models ?? 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>AI Generations</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stats?.generated_projects ?? 0}</span>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 1.5rem 0' }}>Quick Settings</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>🔒</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Security & Keys</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>›</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>🔗</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Integrations</span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>›</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: '0.5rem' }} onClick={handleLogout}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ color: '#EF5350' }}>⏻</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#EF5350' }}>Sign Out</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditing && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '2rem', width: '100%', maxWidth: 400 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.5rem 0' }}>Edit Profile</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Full Name</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '0.95rem' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Address</label>
                                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '0.95rem' }} />
                            </div>
                        </div>
                        {saveMsg && <p style={{ fontSize: '0.85rem', color: saveMsg.includes('success') ? '#4ECDC4' : '#EF5350', marginBottom: '1rem' }}>{saveMsg}</p>}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleSaveProfile} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
