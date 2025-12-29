import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import type { LoginData, RegisterData } from '../services/api';
import '../styles/LoginPage.css';

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
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Research Network</h1>
                <p className="login-subtitle">Academic Collaboration Platform</p>

                <div className="login-tabs">
                    <button
                        className={`login-tab ${isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(true)}
                    >
                        Login
                    </button>
                    <button
                        className={`login-tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(false)}
                    >
                        Register
                    </button>
                </div>

                {error && <div className="login-error">{error}</div>}

                {isLogin ? (
                    <form onSubmit={handleLogin} className="login-form">
                        <input
                            type="email"
                            placeholder="Email"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            className="login-input"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            className="login-input"
                            required
                        />
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Loading...' : 'Login'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="login-form">
                        <input
                            type="email"
                            placeholder="Email"
                            value={registerData.email}
                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                            className="login-input"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={registerData.password}
                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                            className="login-input"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={registerData.fullName}
                            onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                            className="login-input"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Title (optional)"
                            value={registerData.title}
                            onChange={(e) => setRegisterData({ ...registerData, title: e.target.value })}
                            className="login-input"
                        />
                        <input
                            type="text"
                            placeholder="Institution (optional)"
                            value={registerData.institution}
                            onChange={(e) => setRegisterData({ ...registerData, institution: e.target.value })}
                            className="login-input"
                        />
                        <input
                            type="text"
                            placeholder="Department (optional)"
                            value={registerData.department}
                            onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                            className="login-input"
                        />
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Loading...' : 'Register'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
