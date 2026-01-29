import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import '../styles/LoginPage.css';

type Step = 'email' | 'code' | 'password';

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resendDisabled, setResendDisabled] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend timer countdown
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setResendDisabled(false);
        }
    }, [resendTimer]);

    // Step 1: Request reset code
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authApi.forgotPassword({ email });
            setSuccess('If your email is registered, you will receive a reset code shortly.');
            setStep('code');
            setResendDisabled(true);
            setResendTimer(60);
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify code
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const codeString = code.join('');
        if (codeString.length !== 6) {
            setError('Please enter the complete 6-digit code.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await authApi.verifyResetCode({ email, code: codeString });
            setSuccess('Code verified successfully!');
            setStep('password');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid or expired code.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const codeString = code.join('');
            await authApi.resetPassword({ email, code: codeString, newPassword });
            setSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    // Handle code input changes
    const handleCodeChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
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

    const handleResendCode = async () => {
        if (resendDisabled) return;

        setLoading(true);
        setError(null);

        try {
            await authApi.forgotPassword({ email });
            setSuccess('A new code has been sent to your email.');
            setResendDisabled(true);
            setResendTimer(60);
        } catch (err: any) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-title">Reset Password</h1>
                <p className="login-subtitle">
                    {step === 'email' && 'Enter your email to receive a reset code'}
                    {step === 'code' && 'Enter the 6-digit code sent to your email'}
                    {step === 'password' && 'Enter your new password'}
                </p>

                {error && <div className="login-error">{error}</div>}
                {success && <div className="login-success">{success}</div>}

                {/* Step 1: Email Input */}
                {step === 'email' && (
                    <form onSubmit={handleRequestCode} className="login-form">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="login-input"
                            required
                        />
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Code'}
                        </button>
                    </form>
                )}

                {/* Step 2: Code Verification */}
                {step === 'code' && (
                    <form onSubmit={handleVerifyCode} className="login-form">
                        <div className="verification-code-inputs" onPaste={handlePaste}>
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="verification-code-input"
                                />
                            ))}
                        </div>
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <div className="login-footer">
                            Didn't receive the code?{' '}
                            <button
                                type="button"
                                className="login-footer-link"
                                onClick={handleResendCode}
                                disabled={resendDisabled}
                            >
                                {resendDisabled ? `Resend in ${resendTimer}s` : 'Resend Code'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: New Password */}
                {step === 'password' && (
                    <form onSubmit={handleResetPassword} className="login-form">
                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="login-input"
                            required
                            minLength={6}
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="login-input"
                            required
                            minLength={6}
                        />
                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="login-footer" style={{ marginTop: '1.5rem' }}>
                    <button
                        className="login-footer-link"
                        onClick={() => navigate('/login')}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
