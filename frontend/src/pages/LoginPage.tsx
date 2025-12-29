import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import type { LoginData, RegisterData } from '../services/api';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [loginData, setLoginData] = useState<LoginData>({
        email: '',
        password: '',
    });

    const [registerData, setRegisterData] = useState<RegisterData>({
        email: '',
        password: '',
        fullName: '',
        title: '',
        institution: '',
        department: '',
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.login(loginData);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/profile');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await authApi.register(registerData);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/profile');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>Research Network</h1>
                <p style={styles.subtitle}>Academic Collaboration Platform</p>

                <div style={styles.tabs}>
                    <button
                        style={{ ...styles.tab, ...(isLogin ? styles.activeTab : {}) }}
                        onClick={() => setIsLogin(true)}
                    >
                        Login
                    </button>
                    <button
                        style={{ ...styles.tab, ...(!isLogin ? styles.activeTab : {}) }}
                        onClick={() => setIsLogin(false)}
                    >
                        Register
                    </button>
                </div>

                {error && <div style={styles.error}>{error}</div>}

                {isLogin ? (
                    <form onSubmit={handleLogin} style={styles.form}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            style={styles.input}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            style={styles.input}
                            required
                        />
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? 'Loading...' : 'Login'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} style={styles.form}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            style={styles.input}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                            style={styles.input}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={registerData.fullName}
                            onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                            style={styles.input}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Title (optional)"
                            value={registerData.title}
                            onChange={(e) => setRegisterData({ ...registerData, title: e.target.value })}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="Institution (optional)"
                            value={registerData.institution}
                            onChange={(e) => setRegisterData({ ...registerData, institution: e.target.value })}
                            style={styles.input}
                        />
                        <input
                            type="text"
                            placeholder="Department (optional)"
                            value={registerData.department}
                            onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                            style={styles.input}
                        />
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? 'Loading...' : 'Register'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
    },
    card: {
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: 700,
        textAlign: 'center',
        color: '#333',
    },
    subtitle: {
        margin: '8px 0 24px',
        fontSize: '14px',
        textAlign: 'center',
        color: '#666',
    },
    tabs: {
        display: 'flex',
        marginBottom: '24px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #ddd',
    },
    tab: {
        flex: 1,
        padding: '12px',
        border: 'none',
        background: '#f5f5f5',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    activeTab: {
        background: '#667eea',
        color: 'white',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    input: {
        padding: '14px 16px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    button: {
        padding: '14px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    error: {
        background: '#fee',
        color: '#c00',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        textAlign: 'center',
    },
};

export default LoginPage;
