import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import type { RegisterData } from '../services/api';
import '../styles/LoginPage.css';

// Kabul edilen akademik email domain'leri
const ACADEMIC_DOMAINS = ['.edu.tr', '.ac.uk', '.edu'];

const isAcademicEmail = (email: string): boolean => {
    const lowerEmail = email.toLowerCase();
    return ACADEMIC_DOMAINS.some(domain => lowerEmail.endsWith(domain));
};

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);

    const [registerData, setRegisterData] = useState<RegisterData>({
        email: '',
        password: '',
        fullName: '',
        title: '',
        institution: '',
        department: '',
    });

    const validateEmail = (email: string) => {
        if (email && !isAcademicEmail(email)) {
            setEmailError('Sadece akademik email adresleri kabul edilmektedir (.edu.tr, .ac.uk, .edu)');
        } else {
            setEmailError(null);
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setRegisterData({ ...registerData, email });
        validateEmail(email);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isAcademicEmail(registerData.email)) {
            setError('Sadece akademik email adresleri kabul edilmektedir (.edu.tr, .ac.uk, .edu)');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await authApi.register(registerData);
            // Doğrulama sayfasına yönlendir
            navigate('/verify-email', {
                state: {
                    email: registerData.email,
                    message: response.data.message
                }
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kayıt başarısız.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Hesap Oluştur</h1>
                <p className="login-subtitle">Akademik topluluğumuza katılın</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleRegister} className="login-form">
                    <input
                        type="text"
                        placeholder="Ad Soyad"
                        value={registerData.fullName}
                        onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                        className="login-input"
                        required
                    />
                    <div className="input-wrapper">
                        <input
                            type="email"
                            placeholder="Akademik Email (.edu.tr, .ac.uk, .edu)"
                            value={registerData.email}
                            onChange={handleEmailChange}
                            className={`login-input ${emailError ? 'input-error' : ''}`}
                            required
                        />
                        {emailError && <span className="input-error-text">{emailError}</span>}
                    </div>
                    <input
                        type="password"
                        placeholder="Şifre"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="login-input"
                        required
                        minLength={6}
                    />
                    <input
                        type="text"
                        placeholder="Akademik Unvan (isteğe bağlı)"
                        value={registerData.title || ''}
                        onChange={(e) => setRegisterData({ ...registerData, title: e.target.value })}
                        className="login-input"
                    />
                    <input
                        type="text"
                        placeholder="Kurum (isteğe bağlı)"
                        value={registerData.institution || ''}
                        onChange={(e) => setRegisterData({ ...registerData, institution: e.target.value })}
                        className="login-input"
                    />
                    <input
                        type="text"
                        placeholder="Bölüm (isteğe bağlı)"
                        value={registerData.department || ''}
                        onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                        className="login-input"
                    />
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading || !!emailError}
                    >
                        {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                    </button>
                </form>

                <div className="login-footer">
                    Zaten hesabınız var mı?{' '}
                    <button
                        className="login-footer-link"
                        onClick={() => navigate('/login')}
                    >
                        Giriş Yap
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
