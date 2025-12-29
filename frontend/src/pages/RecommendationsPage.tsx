import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api';
import type { User } from '../services/api';
import '../styles/RecommendationsPage.css';

const RecommendationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchUsers = async () => {
            try {
                const response = await usersApi.getAll();
                // Filter out current user
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const otherUsers = response.data.filter((u: User) => u.id !== currentUser.id);
                setUsers(otherUsers);
            } catch (err) {
                console.error('Failed to fetch users', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="rec-container">
            <nav className="rec-nav">
                <h2 className="rec-logo">Research Network</h2>
                <div className="rec-nav-links">
                    <button onClick={() => navigate('/profile')} className="rec-nav-button">Profile</button>
                    <button onClick={() => navigate('/recommendations')} className="rec-nav-button active">Recommendations</button>
                    <button onClick={handleLogout} className="rec-logout-button">Logout</button>
                </div>
            </nav>

            <div className="rec-content">
                <h1 className="rec-title">Recommended Researchers</h1>
                <p className="rec-subtitle">
                    Connect with researchers in similar fields. AI-powered recommendations coming soon!
                </p>

                {loading ? (
                    <div className="rec-loading-box">Loading recommendations...</div>
                ) : users.length === 0 ? (
                    <div className="rec-empty-state">
                        <div className="rec-empty-icon">👥</div>
                        <h3>No Researchers Found</h3>
                        <p>Be the first to invite your colleagues to join!</p>
                    </div>
                ) : (
                    <div className="rec-grid">
                        {users.map((user) => (
                            <div key={user.id} className="rec-card">
                                <div className="rec-avatar">{user.fullName.charAt(0).toUpperCase()}</div>
                                <h3 className="rec-card-name">{user.fullName}</h3>
                                <p className="rec-card-title">{user.title || 'Researcher'}</p>
                                <p className="rec-card-institution">{user.institution || 'No institution'}</p>
                                {user.interestTags.length > 0 && (
                                    <div className="rec-tags">
                                        {user.interestTags.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="rec-tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                                <button className="rec-connect-button">Connect</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="rec-ai-note">
                    <div className="rec-ai-icon">🤖</div>
                    <div>
                        <h4 className="rec-ai-title">AI Matching Engine</h4>
                        <p className="rec-ai-text">
                            Our AI-powered recommendation system will analyze your research interests,
                            publications, and academic profile to suggest the most relevant collaborators.
                            This feature is currently under development.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationsPage;
