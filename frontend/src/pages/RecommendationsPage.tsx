import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/layout';
import { LoadingSpinner } from '../components/ui';
import { ResearcherCard, EmptyState, AIInfoBox } from '../components/features/recommendations';
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

    const handleConnect = (user: User) => {
        console.log('Connect to user:', user.fullName);
        // TODO: Implement connection logic
    };

    return (
        <PageLayout>
            <div className="rec-content">
                <h1 className="rec-title">Recommended Researchers</h1>
                <p className="rec-subtitle">
                    Connect with researchers in similar fields. AI-powered recommendations coming soon!
                </p>

                {loading ? (
                    <LoadingSpinner message="Loading recommendations..." />
                ) : users.length === 0 ? (
                    <EmptyState
                        icon="👥"
                        title="No Researchers Found"
                        message="Be the first to invite your colleagues to join!"
                    />
                ) : (
                    <div className="rec-grid">
                        {users.map((user) => (
                            <ResearcherCard
                                key={user.id}
                                user={user}
                                onConnect={handleConnect}
                            />
                        ))}
                    </div>
                )}

                <AIInfoBox />
            </div>
        </PageLayout>
    );
};

export default RecommendationsPage;
