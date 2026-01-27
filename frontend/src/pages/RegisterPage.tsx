import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import type { RegisterData } from '../services/api';
import '../styles/LoginPage.css';

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [registerData, setRegisterData] = useState<RegisterData>({
        email: '',
        password: '',
        fullName: '',
        title: '',
        institution: '',
        department: '',
    });

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
                <h1 className="login-title">Create Account</h1>
                <p className="login-subtitle">Join our academic community</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleRegister} className="login-form">
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={registerData.fullName}
                        onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                        className="login-input"
                        required
                    />
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
                        placeholder="Title (optional)"
                        value={registerData.title || ''}
                        onChange={(e) => setRegisterData({ ...registerData, title: e.target.value })}
                        className="login-input"
                    />
                    <input
                        type="text"
                        placeholder="Institution (optional)"
                        value={registerData.institution || ''}
                        onChange={(e) => setRegisterData({ ...registerData, institution: e.target.value })}
                        className="login-input"
                    />
                    <input
                        type="text"
                        placeholder="Department (optional)"
                        value={registerData.department || ''}
                        onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                        className="login-input"
                    />
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="login-footer">
                    Already have an account?{' '}
                    <button
                        className="login-footer-link"
                        onClick={() => navigate('/login')}
                    >
                        Sign in
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
