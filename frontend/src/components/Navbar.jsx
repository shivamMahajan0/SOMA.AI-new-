import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listProjects } from '../api';

export default function Navbar({ theme, toggleTheme, toggleSidebar }) {
    const navigate = useNavigate();
    const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // Load projects once for search
    useEffect(() => {
        listProjects().then(r => setAllProjects(r.data || [])).catch(() => {});
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const q = query.toLowerCase();
        const filtered = allProjects.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.filename?.toLowerCase().includes(q) ||
            p.task_type?.toLowerCase().includes(q)
        );
        setSearchResults(filtered);
        setShowDropdown(true);
    };

    const handleSelect = (project) => {
        setShowDropdown(false);
        setSearchQuery('');
        navigate(`/project/${project.id}`);
    };

    return (
        <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <button className="mobile-menu-btn icon-btn" onClick={toggleSidebar}>
                    ☰
                </button>
                <div className="topbar-search" ref={searchRef} style={{ position: 'relative' }}>
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    placeholder="Search projects by name, file, or type..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                />
                {showDropdown && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)', maxHeight: 300, overflowY: 'auto',
                        zIndex: 999, boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}>
                        {searchResults.length === 0 ? (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                                No projects found for "{searchQuery}"
                            </div>
                        ) : (
                            searchResults.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelect(p)}
                                    style={{
                                        padding: '0.75rem 1rem', cursor: 'pointer',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {p.filename} — {p.task_type || 'unset'}
                                        </div>
                                    </div>
                                    <span style={{
                                        fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                                        borderRadius: 8,
                                        background: p.status === 'completed' ? 'rgba(78,205,196,0.1)' : 'rgba(255,255,255,0.05)',
                                        color: p.status === 'completed' ? '#4ECDC4' : 'var(--text-secondary)',
                                        textTransform: 'uppercase'
                                    }}>{p.status}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            </div>

            <div className="topbar-actions">
                <button className="icon-btn" title="Notifications">🔔</button>
                <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
                
                {user ? (
                    <Link to="/profile" className="user-profile-badge">
                        <div className="user-info">
                            <span className="user-name">{user.name || 'User'}</span>
                            <span className="user-role">{user.email || ''}</span>
                        </div>
                        <div className="avatar">
                            {(user.name || 'U')[0].toUpperCase()}
                        </div>
                    </Link>
                ) : (
                    <Link to="/login" className="btn btn-primary btn-sm rounded-full">
                        Sign In
                    </Link>
                )}
            </div>
        </header>
    );
}
