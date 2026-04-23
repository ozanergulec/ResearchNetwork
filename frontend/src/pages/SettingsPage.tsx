import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import {
    SettingsSidebar,
    ProfileSection,
    AccountSection,
    PrivacySection,
    PreferencesSection,
} from '../components/settings';
import type {
    SettingsSection as SettingsSectionKey,
    ProfileFormState,
    EmailFormState,
    PasswordFormState,
} from '../components/settings';
import { settingsApi } from '../services/settingsService';
import type { UserSettings } from '../services/settingsService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation, getTranslations } from '../translations/translations';
import '../styles/pages/SettingsPage.css';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<SettingsSectionKey>('profile');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { setLanguage } = useLanguage();
    const t = useTranslation();

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

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
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
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleProfileSave = async () => {
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
    };

    const handlePasswordChange = async () => {
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
    };

    const handleEmailChange = async () => {
        if (!emailForm.newEmail || !emailForm.password) {
            showMessage('error', t.settings.fillAllFields);
            return;
        }
        setSaving(true);
        try {
            await settingsApi.changeEmail(emailForm);
            showMessage('success', t.settings.emailUpdated);
            setEmailForm({ newEmail: '', password: '' });
            fetchSettings();
        } catch {
            showMessage('error', t.settings.emailChangeFailed);
        } finally {
            setSaving(false);
        }
    };

    const handlePrivacyChange = async (level: number) => {
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
    };

    const handleLanguageChange = async (newLang: string) => {
        setSaving(true);
        try {
            const res = await settingsApi.updateLanguage({ language: newLang });
            setSettings(res.data);
            showMessage('success', getTranslations(newLang).settings.languageUpdated);
            setLanguage(newLang);
        } catch {
            showMessage('error', t.settings.languageFailed);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
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
    };

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

                        {activeSection === 'preferences' && (
                            <PreferencesSection
                                settings={settings}
                                onLanguageChange={handleLanguageChange}
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
