import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import '../styles/LoginPage.css';

const VerifyEmailPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!email) {
            navigate('/register');
        }
    }, [email, navigate]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) {
            value = value.slice(-1);
        }

        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newCode = [...code];
        for (let i = 0; i < pastedData.length; i++) {
            newCode[i] = pastedData[i];
        }
        setCode(newCode);
        if (pastedData.length === 6) {
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullCode = code.join('');

        if (fullCode.length !== 6) {
            setError('Lütfen 6 haneli kodu girin.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await authApi.verifyEmail({ email, code: fullCode });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setSuccess('Email doğrulandı! Yönlendiriliyorsunuz...');
            setTimeout(() => navigate('/profile'), 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Doğrulama başarısız.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        try {
            await authApi.resendVerificationCode(email);
            setSuccess('Yeni doğrulama kodu gönderildi.');
            setResendCooldown(60);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kod gönderilemedi.');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Email Doğrulama</h1>
                <p className="login-subtitle">
                    <strong>{email}</strong> adresine gönderilen 6 haneli kodu girin
                </p>

                {error && <div className="login-error">{error}</div>}
                {success && <div className="login-success">{success}</div>}

                <form onSubmit={handleVerify} className="login-form">
                    <div className="verification-code-inputs">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="verification-code-input"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? 'Doğrulanıyor...' : 'Doğrula'}
                    </button>
                </form>

                <div className="login-footer">
                    Kod gelmedi mi?{' '}
                    <button
                        className="login-footer-link"
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                    >
                        {resendCooldown > 0 ? `Tekrar gönder (${resendCooldown}s)` : 'Tekrar gönder'}
                    </button>
                </div>

                <div className="login-footer" style={{ marginTop: '10px' }}>
                    <button
                        className="login-footer-link"
                        onClick={() => navigate('/register')}
                    >
                        ← Kayıt sayfasına dön
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
