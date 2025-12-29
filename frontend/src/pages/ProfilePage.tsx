import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../services/api';
import type { User, UpdateUserData } from '../services/api';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [updateData, setUpdateData] = useState<UpdateUserData>({});

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setUpdateData({
                fullName: parsed.fullName,
                title: parsed.title || '',
                institution: parsed.institution || '',
                department: parsed.department || '',
                bio: parsed.bio || '',
                interestTags: parsed.interestTags || [],
            });
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await usersApi.update(user.id, updateData);
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
            setEditing(false);
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return <div style={styles.loading}>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            <nav style={styles.nav}>
                <h2 style={styles.logo}>Research Network</h2>
                <div style={styles.navLinks}>
                    <button onClick={() => navigate('/profile')} style={styles.navButton}>Profile</button>
                    <button onClick={() => navigate('/recommendations')} style={styles.navButton}>Recommendations</button>
                    <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                </div>
            </nav>

            <div style={styles.content}>
                <div style={styles.card}>
                    <div style={styles.header}>
                        <div style={styles.avatar}>{user.fullName.charAt(0).toUpperCase()}</div>
                        <div>
                            <h1 style={styles.name}>{user.fullName}</h1>
                            <p style={styles.email}>{user.email}</p>
                        </div>
                    </div>

                    {editing ? (
                        <div style={styles.editForm}>
                            <label style={styles.label}>
                                Full Name
                                <input
                                    type="text"
                                    value={updateData.fullName || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, fullName: e.target.value })}
                                    style={styles.input}
                                />
                            </label>
                            <label style={styles.label}>
                                Title
                                <input
                                    type="text"
                                    value={updateData.title || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, title: e.target.value })}
                                    style={styles.input}
                                />
                            </label>
                            <label style={styles.label}>
                                Institution
                                <input
                                    type="text"
                                    value={updateData.institution || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, institution: e.target.value })}
                                    style={styles.input}
                                />
                            </label>
                            <label style={styles.label}>
                                Department
                                <input
                                    type="text"
                                    value={updateData.department || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, department: e.target.value })}
                                    style={styles.input}
                                />
                            </label>
                            <label style={styles.label}>
                                Bio
                                <textarea
                                    value={updateData.bio || ''}
                                    onChange={(e) => setUpdateData({ ...updateData, bio: e.target.value })}
                                    style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
                                />
                            </label>
                            <div style={styles.buttonGroup}>
                                <button onClick={handleSave} style={styles.saveButton} disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button onClick={() => setEditing(false)} style={styles.cancelButton}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={styles.details}>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Title:</span>
                                <span>{user.title || 'Not specified'}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Institution:</span>
                                <span>{user.institution || 'Not specified'}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Department:</span>
                                <span>{user.department || 'Not specified'}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Bio:</span>
                                <span>{user.bio || 'No bio yet'}</span>
                            </div>
                            <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Interest Tags:</span>
                                <span>{user.interestTags.length > 0 ? user.interestTags.join(', ') : 'None'}</span>
                            </div>
                            <button onClick={() => setEditing(true)} style={styles.editButton}>
                                Edit Profile
                            </button>
                        </div>
                    )}
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
        maxWidth: '800px',
        margin: '32px auto',
        padding: '0 16px',
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '24px',
        paddingBottom: '24px',
        borderBottom: '1px solid #eee',
    },
    avatar: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        fontWeight: 700,
    },
    name: {
        margin: 0,
        fontSize: '24px',
        fontWeight: 700,
        color: '#333',
    },
    email: {
        margin: '4px 0 0',
        color: '#666',
        fontSize: '14px',
    },
    details: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    detailRow: {
        display: 'flex',
        gap: '12px',
    },
    detailLabel: {
        fontWeight: 600,
        color: '#666',
        minWidth: '120px',
    },
    editButton: {
        marginTop: '16px',
        padding: '12px 24px',
        border: 'none',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: 'pointer',
        alignSelf: 'flex-start',
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    label: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '14px',
        fontWeight: 500,
        color: '#444',
    },
    input: {
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        fontSize: '14px',
        outline: 'none',
    },
    buttonGroup: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
    },
    saveButton: {
        padding: '12px 24px',
        border: 'none',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: 'pointer',
    },
    cancelButton: {
        padding: '12px 24px',
        border: '1px solid #ddd',
        background: 'transparent',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '8px',
        cursor: 'pointer',
        color: '#666',
    },
    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666',
    },
};

export default ProfilePage;
