import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/userService';
import type { User } from '../services/userService';
import { Navbar, Loading, UserCard } from '../components';
import { useTranslation } from '../translations/translations';
import '../styles/pages/RecommendationsPage.css';

const RecommendationsPage: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();
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

    return (
        <div className="rec-container">
            <Navbar currentPage="recommendations" />

            <div className="rec-content">
                <h1 className="rec-title">{t.recommendations.title}</h1>
                <p className="rec-subtitle">
                    {t.recommendations.subtitle}
                </p>

                {loading ? (
                    <Loading message={t.recommendations.loadingRec} />
                ) : users.length === 0 ? (
                    <div className="rec-empty-state">
                        <div className="rec-empty-icon">👥</div>
                        <h3>{t.recommendations.noResearchers}</h3>
                        <p>{t.recommendations.noResearchersDesc}</p>
                    </div>
                ) : (
                    <div className="rec-grid">
                        {users.map((user) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                onConnect={() => console.log('Connect to', user.fullName)}
                            />
                        ))}
                    </div>
                )}

                <div className="rec-ai-note">
                    <div className="rec-ai-icon">🤖</div>
                    <div>
                        <h4 className="rec-ai-title">{t.recommendations.aiTitle}</h4>
                        <p className="rec-ai-text">
                            {t.recommendations.aiText}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecommendationsPage;
