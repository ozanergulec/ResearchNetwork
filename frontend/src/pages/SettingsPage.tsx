import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import {
    SettingsSidebar,
    ProfileSection,
    AccountSection,
    PrivacySection,
} from '../components/settings';
import type {
    SettingsSection as SettingsSectionKey,
    ProfileFormState,
    EmailFormState,
    PasswordFormState,
} from '../components/settings';
import { settingsApi } from '../services/settingsService';
import type { UserSettings } from '../services/settingsService';
import { useTranslation } from '../translations/translations';
import '../styles/pages/SettingsPage.css';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<SettingsSectionKey>('profile');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const t = useTranslation();
    const toastTimerRef = useRef<number | null>(null);

    const [profileForm, setProfileForm] = useState<ProfileFormState>({
        fullName: '',
        title: '',
        institution: '',
        department: '',
        bio: '',
    });

    const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [emailForm, setEmailForm] = useState<EmailFormState>({
        newEmail: '',
        password: '',
    });

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await settingsApi.getSettings();
            setSettings(res.data);
            setProfileForm({
                fullName: res.data.fullName || '',
                title: res.data.title || '',
                institution: res.data.institution || '',
                department: res.data.department || '',
                bio: res.data.bio || '',
            });
        } catch (err) {
            console.error('Failed to load settings', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current !== null) {
                window.clearTimeout(toastTimerRef.current);
            }
        };
    }, []);

    const showMessage = useCallback((type: 'success' | 'error', text: string) => {
        if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
        }
        setMessage({ type, text });
        toastTimerRef.current = window.setTimeout(() => {
            setMessage(null);
            toastTimerRef.current = null;
        }, 4000);
    }, []);

    const handleProfileSave = useCallback(async () => {
        setSaving(true);
        try {
            const res = await settingsApi.updateProfile(profileForm);
            setSettings(res.data);
            showMessage('success', t.settings.profileUpdated);
        } catch {
            showMessage('error', t.settings.profileUpdateFailed);
        } finally {
            setSaving(false);
        }
    }, [profileForm, showMessage, t]);

    const handlePasswordChange = useCallback(async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showMessage('error', t.settings.passwordsNoMatch);
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            showMessage('error', t.settings.passwordTooShort);
            return;
        }
        setSaving(true);
        try {
            await settingsApi.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            showMessage('success', t.settings.passwordChanged);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch {
            showMessage('error', t.settings.wrongPassword);
        } finally {
            setSaving(false);
        }
    }, [passwordForm, showMessage, t]);

    const handleEmailChange = useCallback(async () => {
        if (!emailForm.newEmail || !emailForm.password) {
            showMessage('error', t.settings.fillAllFields);
            return;
        }
        setSaving(true);
        try {
            const res = await settingsApi.changeEmail(emailForm);
            setSettings(res.data);
            showMessage('success', t.settings.emailUpdated);
            setEmailForm({ newEmail: '', password: '' });
        } catch {
            showMessage('error', t.settings.emailChangeFailed);
        } finally {
            setSaving(false);
        }
    }, [emailForm, showMessage, t]);

    const handlePrivacyChange = useCallback(async (level: number) => {
        setSaving(true);
        try {
            const res = await settingsApi.updatePrivacy({ privacyLevel: level });
            setSettings(res.data);
            showMessage('success', t.settings.privacyUpdated);
        } catch {
            showMessage('error', t.settings.privacyFailed);
        } finally {
            setSaving(false);
        }
    }, [showMessage, t]);

    const handleDeleteAccount = useCallback(async () => {
        setSaving(true);
        try {
            await settingsApi.deleteAccount();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        } catch {
            showMessage('error', t.settings.deleteFailed);
            setSaving(false);
        }
    }, [navigate, showMessage, t]);

    if (loading) {
        return (
            <>
                <Navbar currentPage="settings" />
                <div className="settings-page">
                    <div className="settings-loading">
                        <div className="settings-spinner" />
                        <span>{t.settings.loadingSettings}</span>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar currentPage="settings" />
            <div className="settings-page">
                {message && (
                    <div className={`settings-toast ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="settings-container">
                    <SettingsSidebar
                        activeSection={activeSection}
                        onSectionChange={setActiveSection}
                        t={t}
                    />

                    <main className="settings-content">
                        {activeSection === 'profile' && (
                            <ProfileSection
                                profileForm={profileForm}
                                onProfileFormChange={setProfileForm}
                                onSave={handleProfileSave}
                                saving={saving}
                                settings={settings}
                                t={t}
                            />
                        )}

                        {activeSection === 'account' && (
                            <AccountSection
                                settings={settings}
                                emailForm={emailForm}
                                onEmailFormChange={setEmailForm}
                                onEmailChange={handleEmailChange}
                                passwordForm={passwordForm}
                                onPasswordFormChange={setPasswordForm}
                                onPasswordChange={handlePasswordChange}
                                onDeleteAccount={handleDeleteAccount}
                                saving={saving}
                                t={t}
                            />
                        )}

                        {activeSection === 'privacy' && (
                            <PrivacySection
                                settings={settings}
                                onPrivacyChange={handlePrivacyChange}
                                saving={saving}
                                t={t}
                            />
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;
