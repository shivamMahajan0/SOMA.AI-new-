import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import MainDashboard from './pages/MainDashboard';
import ProjectCreate from './pages/ProjectCreate';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';
import CodeView from './pages/CodeView';
import Reports from './pages/Reports';
import Copilot from './pages/Copilot';
import Versions from './pages/Versions';
import Login from './pages/Login';
import Profile from './pages/Profile';
import DocumentView from './pages/DocumentView';
import DocumentList from './pages/DocumentList';
import PdfVideoCreate from './pages/PdfVideoCreate';
import ProjectGenerator from './pages/ProjectGenerator';
import ContentSummarizer from './pages/ContentSummarizer';
import SummaryResult from './pages/SummaryResult';
import ResearchDashboard from './pages/ResearchDashboard';
import ResearchAgent from './pages/ResearchAgent';

function AppContent({ theme, toggleTheme }) {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';
    const isLandingPage = location.pathname === '/';
    const hideChrome = isLoginPage || isLandingPage;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    return (
        <div className="app-layout">
            {!hideChrome && (
                <>
                    {/* Mobile Overlay */}
                    <div 
                        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <Sidebar theme={theme} isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
                </>
            )}
            <div className={hideChrome ? "main-viewport full-width" : "main-viewport"}>
                {!hideChrome && <Navbar theme={theme} toggleTheme={toggleTheme} toggleSidebar={toggleSidebar} />}
                {/* Minimal top bar for login/landing */}
                {isLoginPage && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '1rem 2rem', gap: '1rem', position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
                        <button
                            onClick={toggleTheme}
                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1rem' }}
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                )}
                <div className="page-content">
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/dashboard" element={<MainDashboard />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/new" element={<ProjectCreate />} />
                        <Route path="/project/:id" element={<Dashboard />} />
                        <Route path="/project/:id?/predict" element={<Predict />} />
                        <Route path="/project/:id?/code" element={<CodeView />} />
                        <Route path="/project/:id?/reports" element={<Reports />} />
                        <Route path="/project/:id?/copilot" element={<Copilot />} />
                        <Route path="/project/:id?/versions" element={<Versions />} />
                        <Route path="/document/list" element={<DocumentList />} />
                        <Route path="/document/:id" element={<DocumentView />} />
                        <Route path="/pdf-video/new" element={<PdfVideoCreate />} />
                        <Route path="/ai-project-generator" element={<ProjectGenerator />} />
                        <Route path="/summarizer/new" element={<ContentSummarizer />} />
                        <Route path="/summarizer/:id" element={<SummaryResult />} />
                        <Route path="/research/dashboard" element={<ResearchDashboard />} />
                        <Route path="/research/new" element={<ResearchAgent />} />
                        <Route path="/research/:id" element={<ResearchAgent />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return (
        <BrowserRouter>
            <AppContent theme={theme} toggleTheme={toggleTheme} />
        </BrowserRouter>
    );
}

export default App;
