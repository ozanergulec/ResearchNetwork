import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api';
import type { User } from '../services/api';
import { Navbar, Loading, UserCard } from '../components';
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

    return (
        <div className="rec-container">
            <Navbar currentPage="recommendations" />

            <div className="rec-content">
                <h1 className="rec-title">Recommended Researchers</h1>
                <p className="rec-subtitle">
                    Connect with researchers in similar fields. AI-powered recommendations coming soon!
                </p>

                {loading ? (
                    <Loading message="Loading recommendations..." />
                ) : users.length === 0 ? (
                    <div className="rec-empty-state">
                        <div className="rec-empty-icon">👥</div>
                        <h3>No Researchers Found</h3>
                        <p>Be the first to invite your colleagues to join!</p>
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
