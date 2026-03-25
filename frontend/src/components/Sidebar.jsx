import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ theme, isOpen, closeSidebar }) {
    const location = useLocation();

    const isActive = (path, partial = false) => {
        if (partial) {
            return location.pathname.includes(path) ? 'active' : '';
        }
        return location.pathname === path ? 'active' : '';
    };

    return (
        <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-header">
                <Link to="/" className="sidebar-brand">
                    <div className="logo-icon dark-glow">✦</div>
                    <div className="brand-text">
                        <h2>SOMA.AI</h2>
                        <span>AI PLATFORM</span>
                    </div>
                </Link>
                {/* Mobile Close Button */}
                <button className="mobile-close-btn" onClick={closeSidebar}>
                    ✕
                </button>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-group">
                    <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                        <span className="icon">⊞</span>
                        Dashboard
                    </Link>
                    <Link to="/document/list" className={`nav-item ${isActive('/document', true)}`}>
                        <span className="icon">📄</span>
                        Documents
                    </Link>
                    <Link to="/reports" className={`nav-item ${isActive('/reports', true)}`}>
                        <span className="icon">📊</span>
                        Reports
                    </Link>
                    <Link to="/summarizer/new" className={`nav-item ${isActive('/summarizer', true)}`}>
                        <span className="icon">⚡</span>
                        Summarizer
                    </Link>
                    <Link to="/research/dashboard" className={`nav-item ${isActive('/research', true)}`}>
                        <span className="icon">🔬</span>
                        Research Agent
                    </Link>
                    <Link to="/ai-project-generator" className={`nav-item ${isActive('/ai-project-generator')}`}>
                        <span className="icon">🚀</span>
                        AI Generator
                    </Link>
                    <Link to="/pdf-video/new" className={`nav-item ${isActive('/pdf-video', true)}`}>
                        <span className="icon">🎬</span>
                        PDF to Video
                    </Link>
                </div>
            </nav>

            <div className="sidebar-footer">
                <Link to="/profile" className={`nav-item ${isActive('/profile')}`}>
                    <span className="icon">👤</span>
                    Profile
                </Link>
            </div>
        </aside>
    );
}
