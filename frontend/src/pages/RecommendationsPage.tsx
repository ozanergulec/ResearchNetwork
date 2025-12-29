import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api';
import type { User } from '../services/api';

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
        <div style={styles.container}>
            <nav style={styles.nav}>
                <h2 style={styles.logo}>Research Network</h2>
                <div style={styles.navLinks}>
                    <button onClick={() => navigate('/profile')} style={styles.navButton}>Profile</button>
                    <button onClick={() => navigate('/recommendations')} style={{ ...styles.navButton, ...styles.activeNav }}>Recommendations</button>
                    <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                </div>
            </nav>

            <div style={styles.content}>
                <h1 style={styles.title}>Recommended Researchers</h1>
                <p style={styles.subtitle}>
                    Connect with researchers in similar fields. AI-powered recommendations coming soon!
                </p>

                {loading ? (
                    <div style={styles.loadingBox}>Loading recommendations...</div>
                ) : users.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>👥</div>
                        <h3>No Researchers Found</h3>
                        <p>Be the first to invite your colleagues to join!</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {users.map((user) => (
                            <div key={user.id} style={styles.card}>
                                <div style={styles.avatar}>{user.fullName.charAt(0).toUpperCase()}</div>
                                <h3 style={styles.cardName}>{user.fullName}</h3>
                                <p style={styles.cardTitle}>{user.title || 'Researcher'}</p>
                                <p style={styles.cardInstitution}>{user.institution || 'No institution'}</p>
                                {user.interestTags.length > 0 && (
                                    <div style={styles.tags}>
                                        {user.interestTags.slice(0, 3).map((tag, i) => (
                                            <span key={i} style={styles.tag}>{tag}</span>
                                        ))}
                                    </div>
                                )}
                                <button style={styles.connectButton}>Connect</button>
                            </div>
                        ))}
                    </div>
                )}

                <div style={styles.aiNote}>
                    <div style={styles.aiIcon}>🤖</div>
                    <div>
                        <h4 style={styles.aiTitle}>AI Matching Engine</h4>
                        <p style={styles.aiText}>
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

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        background: '#f0f2f5',
    },
    nav: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    logo: {
        margin: 0,
        fontSize: '20px',
        fontWeight: 700,
        color: '#667eea',
    },
    navLinks: {
        display: 'flex',
        gap: '8px',
    },
    navButton: {
        padding: '8px 16px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#666',
        borderRadius: '6px',
        transition: 'background 0.2s',
    },
    activeNav: {
        background: '#f0f0f0',
        color: '#667eea',
        fontWeight: 600,
    },
    logoutButton: {
        padding: '8px 16px',
        border: '1px solid #ddd',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#666',
        borderRadius: '6px',
    },
    content: {
        maxWidth: '1200px',
        margin: '32px auto',
        padding: '0 16px',
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: 700,
        color: '#333',
    },
    subtitle: {
        margin: '8px 0 32px',
        color: '#666',
        fontSize: '14px',
    },
    loadingBox: {
        textAlign: 'center',
        padding: '60px',
        color: '#666',
        fontSize: '16px',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    },
    emptyIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s',
    },
    avatar: {
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 700,
        margin: '0 auto 16px',
    },
    cardName: {
        margin: '0 0 4px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#333',
    },
    cardTitle: {
        margin: 0,
        fontSize: '14px',
        color: '#667eea',
    },
    cardInstitution: {
        margin: '4px 0 12px',
        fontSize: '13px',
        color: '#888',
    },
    tags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        justifyContent: 'center',
        marginBottom: '16px',
    },
    tag: {
        padding: '4px 10px',
        background: '#f0f0f0',
        borderRadius: '12px',
        fontSize: '12px',
        color: '#666',
    },
    connectButton: {
        padding: '10px 24px',
        border: 'none',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: 'pointer',
    },
    aiNote: {
        marginTop: '48px',
        padding: '24px',
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '20px',
        border: '1px solid #667eea30',
    },
    aiIcon: {
        fontSize: '32px',
        flexShrink: 0,
    },
    aiTitle: {
        margin: '0 0 8px',
        fontSize: '16px',
        fontWeight: 600,
        color: '#667eea',
    },
    aiText: {
        margin: 0,
        fontSize: '14px',
        color: '#555',
        lineHeight: 1.6,
    },
};

export default RecommendationsPage;
