import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { settingsApi } from '../services/settingsService';
import type { UserSettings } from '../services/settingsService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation, getTranslations } from '../translations/translations';
import '../styles/pages/SettingsPage.css';

type SettingsSection = 'profile' | 'account' | 'privacy' | 'preferences';

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe' },
];

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { setLanguage } = useLanguage();
    const t = useTranslation();

    // Current language
    const lang = settings?.language || 'en';

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        fullName: '',
        title: '',
        institution: '',
        department: '',
        bio: '',
    });

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Email form state
    const [emailForm, setEmailForm] = useState({
        newEmail: '',
        password: '',
    });

    // Delete confirm state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    // ==================== PROFILE ====================
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

    // ==================== PASSWORD ====================
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

    // ==================== EMAIL ====================
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

    // ==================== PRIVACY ====================
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



    // ==================== LANGUAGE ====================
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

    // ==================== DELETE ACCOUNT ====================
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

    const sidebarItems: { key: SettingsSection; label: string }[] = [
        { key: 'profile', label: t.settings.profileInfo },
        { key: 'account', label: t.settings.accountAccess },
        { key: 'privacy', label: t.settings.visibility },
        { key: 'preferences', label: t.settings.generalPreferences },
    ];

    const privacyOptions = [
        { level: 0, label: t.settings.public, desc: t.settings.publicDesc },
        { level: 1, label: t.settings.connectionsOnly, desc: t.settings.connectionsOnlyDesc },
        { level: 2, label: t.settings.private, desc: t.settings.privateDesc },
    ];

    const dateLocale = lang === 'tr' ? 'tr-TR' : 'en-US';

    return (
        <>
            <Navbar currentPage="settings" />
            <div className="settings-page">
                {/* Toast message */}
                {message && (
                    <div className={`settings-toast ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="settings-container">
                    {/* Sidebar */}
                    <aside className="settings-sidebar">
                        <h2 className="settings-sidebar-title">{t.settings.settingsTitle}</h2>
                        <nav className="settings-nav">
                            {sidebarItems.map((item) => (
                                <button
                                    key={item.key}
                                    className={`settings-nav-item ${activeSection === item.key ? 'active' : ''}`}
                                    onClick={() => setActiveSection(item.key)}
                                >
                                    <span className="settings-nav-label">{item.label}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Content */}
                    <main className="settings-content">
                        {/* ==================== PROFILE ==================== */}
                        {activeSection === 'profile' && (
                            <section className="settings-section">
                                <h3 className="settings-section-title">{t.settings.profileInfo}</h3>
                                <p className="settings-section-desc">{t.settings.profileDesc}</p>

                                <div className="settings-form">
                                    <div className="settings-field">
                                        <label>{t.settings.fullName}</label>
                                        <input
                                            type="text"
                                            value={profileForm.fullName}
                                            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                                            placeholder={t.settings.fullNamePlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.settings.title}</label>
                                        <input
                                            type="text"
                                            value={profileForm.title}
                                            onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                                            placeholder={t.settings.titlePlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.settings.institution}</label>
                                        <input
                                            type="text"
                                            value={profileForm.institution}
                                            onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                                            placeholder={t.settings.institutionPlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.settings.department}</label>
                                        <input
                                            type="text"
                                            value={profileForm.department}
                                            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                                            placeholder={t.settings.departmentPlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.settings.bio}</label>
                                        <textarea
                                            value={profileForm.bio}
                                            onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                            placeholder={t.settings.bioPlaceholder}
                                            rows={4}
                                        />
                                    </div>
                                    <button
                                        className="settings-save-btn"
                                        onClick={handleProfileSave}
                                        disabled={saving}
                                    >
                                        {saving ? t.settings.saving : t.settings.save}
                                    </button>
                                </div>

                                {/* Verification Status */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.settings.verificationStatus}</span>
                                        <span className={`settings-badge ${settings?.isVerified ? 'verified' : 'unverified'}`}>
                                            {settings?.isVerified ? t.settings.verified : t.settings.unverified}
                                        </span>
                                    </div>
                                    <p className="settings-card-desc">
                                        {settings?.isVerified ? t.settings.verifiedDesc : t.settings.unverifiedDesc}
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* ==================== ACCOUNT ==================== */}
                        {activeSection === 'account' && (
                            <section className="settings-section">
                                <h3 className="settings-section-title">{t.settings.accountAccess}</h3>

                                {/* Email */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.settings.emailAddress}</span>
                                        <span className="settings-card-value">{settings?.email}</span>
                                    </div>
                                    <div className="settings-form compact">
                                        <div className="settings-field">
                                            <label>{t.settings.newEmail}</label>
                                            <input
                                                type="email"
                                                value={emailForm.newEmail}
                                                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                                                placeholder={t.settings.newEmailPlaceholder}
                                            />
                                        </div>
                                        <div className="settings-field">
                                            <label>{t.settings.currentPassword}</label>
                                            <input
                                                type="password"
                                                value={emailForm.password}
                                                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                                                placeholder={t.settings.currentPasswordPlaceholder}
                                            />
                                        </div>
                                        <button
                                            className="settings-save-btn secondary"
                                            onClick={handleEmailChange}
                                            disabled={saving}
                                        >
                                            {saving ? t.settings.updating : t.settings.updateEmail}
                                        </button>
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.settings.changePassword}</span>
                                    </div>
                                    <div className="settings-form compact">
                                        <div className="settings-field">
                                            <label>{t.settings.currentPasswordLabel}</label>
                                            <input
                                                type="password"
                                                value={passwordForm.currentPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                placeholder={t.settings.currentPasswordFieldPlaceholder}
                                            />
                                        </div>
                                        <div className="settings-field">
                                            <label>{t.settings.newPassword}</label>
                                            <input
                                                type="password"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                placeholder={t.settings.newPasswordPlaceholder}
                                            />
                                        </div>
                                        <div className="settings-field">
                                            <label>{t.settings.confirmNewPassword}</label>
                                            <input
                                                type="password"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                placeholder={t.settings.confirmPasswordPlaceholder}
                                            />
                                        </div>
                                        <button
                                            className="settings-save-btn secondary"
                                            onClick={handlePasswordChange}
                                            disabled={saving}
                                        >
                                            {saving ? t.settings.changing : t.settings.changePassword}
                                        </button>
                                    </div>
                                </div>

                                {/* Delete Account */}
                                <div className="settings-card danger">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.settings.deleteAccount}</span>
                                    </div>
                                    <p className="settings-card-desc">{t.settings.deleteAccountDesc}</p>
                                    {!showDeleteConfirm ? (
                                        <button
                                            className="settings-delete-btn"
                                            onClick={() => setShowDeleteConfirm(true)}
                                        >
                                            {t.settings.deleteMyAccount}
                                        </button>
                                    ) : (
                                        <div className="settings-delete-confirm">
                                            <p>{t.settings.deleteConfirm}</p>
                                            <div className="settings-delete-actions">
                                                <button
                                                    className="settings-delete-btn confirm"
                                                    onClick={handleDeleteAccount}
                                                    disabled={saving}
                                                >
                                                    {saving ? t.settings.deleting : t.settings.yesDelete}
                                                </button>
                                                <button
                                                    className="settings-cancel-btn"
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                >
                                                    {t.settings.cancel}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* ==================== PRIVACY ==================== */}
                        {activeSection === 'privacy' && (
                            <section className="settings-section">
                                <h3 className="settings-section-title">{t.settings.visibility}</h3>
                                <p className="settings-section-desc">{t.settings.visibilityDesc}</p>

                                <div className="settings-privacy-options">
                                    {privacyOptions.map((opt) => (
                                        <button
                                            key={opt.level}
                                            className={`settings-privacy-option ${settings?.privacyLevel === opt.level ? 'active' : ''}`}
                                            onClick={() => handlePrivacyChange(opt.level)}
                                            disabled={saving}
                                        >
                                            <span className="privacy-label">{opt.label}</span>
                                            <span className="privacy-desc">{opt.desc}</span>
                                            {settings?.privacyLevel === opt.level && (
                                                <span className="privacy-check">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}


                        {/* ==================== PREFERENCES ==================== */}
                        {activeSection === 'preferences' && (
                            <section className="settings-section">
                                <h3 className="settings-section-title">{t.settings.generalPreferences}</h3>
                                <p className="settings-section-desc">{t.settings.preferencesDesc}</p>

                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.settings.language}</span>
                                    </div>
                                    <div className="settings-language-options">
                                        {LANGUAGE_OPTIONS.map((langOpt) => (
                                            <button
                                                key={langOpt.value}
                                                className={`settings-language-option ${settings?.language === langOpt.value ? 'active' : ''}`}
                                                onClick={() => handleLanguageChange(langOpt.value)}
                                                disabled={saving}
                                            >
                                                {langOpt.label}
                                                {settings?.language === langOpt.value && <span className="lang-check">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.settings.accountInformation}</span>
                                    </div>
                                    <div className="settings-info-row">
                                        <span className="info-label">{t.settings.registrationDate}</span>
                                        <span className="info-value">
                                            {settings?.createdAt ? new Date(settings.createdAt).toLocaleDateString(dateLocale, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            }) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;
