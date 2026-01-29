import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import type { LoginData } from '../services/api';
import '../styles/LoginPage.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [loginData, setLoginData] = useState<LoginData>({
        email: '',
        password: '',
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
            const errorData = err.response?.data;
            // Email doğrulanmamışsa doğrulama sayfasına yönlendir
            if (errorData?.requiresVerification) {
                navigate('/verify-email', { state: { email: errorData.email } });
                return;
            }
            setError(errorData?.message || 'Giriş başarısız.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Welcome to Research Network!</h1>
                <p className="login-subtitle">Academic Collaboration Platform</p>

                {error && <div className="login-error">{error}</div>}

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
                    <div className="forgot-password-container">
                        <button
                            type="button"
                            className="forgot-password-link"
                            onClick={() => navigate('/forgot-password')}
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    New to Research Network?{' '}
                    <button
                        className="login-footer-link"
                        onClick={() => navigate('/register')}
                    >
                        Join now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
