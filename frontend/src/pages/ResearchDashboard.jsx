import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getResearchHistory } from '../api';
import './Research.css';

const ResearchDashboard = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const { data } = await getResearchHistory();
            setProjects(data || []);
        } catch (error) {
            console.error("Failed to fetch research history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    return (
        <div className="research-dashboard">
            <div className="rd-header">
                <div>
                    <h1 className="rd-title">Research Workspace</h1>
                    <p className="rd-subtitle">Your intelligent AI research hub</p>
                </div>
                <button className="rd-primary-btn" onClick={() => navigate('/research/new')}>
                    <span className="rd-icon">➕</span> New Research
                </button>
            </div>

            <div className="rd-content">
                {loading ? (
                    <div className="rd-loading">
                        <div className="rd-spinner"></div>
                        <p>Loading research history...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="rd-empty-state">
                        <div className="rd-empty-icon">🔍</div>
                        <h3>No research projects yet</h3>
                        <p>Start your first deep dive into any topic, URL, or document.</p>
                        <button className="rd-primary-btn" onClick={() => navigate('/research/new')}>
                            Start Research
                        </button>
                    </div>
                ) : (
                    <div className="rd-grid">
                        {projects.map((proj) => (
                            <div key={proj.id} className="rd-card" onClick={() => navigate(`/research/${proj.id}`)}>
                                <div className="rd-card-header">
                                    <h3 className="rd-card-title">{proj.title}</h3>
                                    <span className={`rd-badge rd-status-${proj.status}`}>
                                        {proj.status.toUpperCase()}
                                    </span>
                                </div>
                                <p className="rd-card-summary">{proj.short_summary || "Research in progress..."}</p>
                                <div className="rd-card-footer">
                                    <div className="rd-stat">
                                        <span className="rd-stat-icon">📚</span>
                                        <span>{proj.sources_count} Sources</span>
                                    </div>
                                    <div className="rd-stat">
                                        <span className="rd-stat-icon">📅</span>
                                        <span>{new Date(proj.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchDashboard;
