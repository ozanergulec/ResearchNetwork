import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { settingsApi } from '../services/settingsService';
import type { UserSettings } from '../services/settingsService';
import '../styles/pages/SettingsPage.css';

type SettingsSection = 'profile' | 'account' | 'privacy' | 'notifications' | 'preferences';

// ==================== TRANSLATIONS ====================
const translations: Record<string, Record<string, string>> = {
    en: {
        // Sidebar
        settingsTitle: 'Settings',
        profileInfo: 'Profile Information',
        accountAccess: 'Account Access',
        visibility: 'Visibility',
        notifications: 'Notifications',
        generalPreferences: 'General Preferences',
        // Profile
        profileDesc: 'Edit your name, title, and institution details.',
        fullName: 'Full Name',
        fullNamePlaceholder: 'Your full name',
        title: 'Title',
        titlePlaceholder: 'e.g. Prof. Dr., Res. Asst.',
        institution: 'Institution',
        institutionPlaceholder: 'University or institution',
        department: 'Department',
        departmentPlaceholder: 'Department or field',
        bio: 'Bio',
        bioPlaceholder: 'A short description about yourself...',
        save: 'Save',
        saving: 'Saving...',
        verificationStatus: 'Verification Status',
        verified: 'Verified',
        unverified: 'Unverified',
        verifiedDesc: 'Your account has been verified with an academic email.',
        unverifiedDesc: 'Use your academic email to verify your account.',
        // Account
        emailAddress: 'Email Address',
        newEmail: 'New Email',
        newEmailPlaceholder: 'new@email.edu',
        currentPassword: 'Current Password',
        currentPasswordPlaceholder: 'Enter your password for security',
        updateEmail: 'Update Email',
        updating: 'Updating...',
        changePassword: 'Change Password',
        currentPasswordLabel: 'Current Password',
        currentPasswordFieldPlaceholder: 'Your current password',
        newPassword: 'New Password',
        newPasswordPlaceholder: 'At least 6 characters',
        confirmNewPassword: 'Confirm New Password',
        confirmPasswordPlaceholder: 'Re-enter new password',
        changing: 'Changing...',
        deleteAccount: 'Delete Account',
        deleteAccountDesc: 'When you delete your account, all your data will be permanently removed. This action cannot be undone.',
        deleteMyAccount: 'Delete My Account',
        deleteConfirm: 'This action cannot be undone. Are you sure?',
        yesDelete: 'Yes, Delete',
        deleting: 'Deleting...',
        cancel: 'Cancel',
        // Privacy
        visibilityDesc: 'Control who can see your profile.',
        public: 'Public',
        publicDesc: 'Everyone can see your profile.',
        connectionsOnly: 'Connections Only',
        connectionsOnlyDesc: 'Only your connections can see your profile.',
        private: 'Private',
        privateDesc: 'Your profile is completely hidden.',
        // Notifications
        notificationsDesc: 'Manage your notification preferences.',
        pushNotifications: 'Push Notifications',
        pushNotificationsDesc: 'New followers, comments, and interaction notifications',
        emailNotifications: 'Email Notifications',
        emailNotificationsDesc: 'Receive important updates via email',
        // Preferences
        preferencesDesc: 'Set your language and display preferences.',
        language: 'Language',
        accountInformation: 'Account Information',
        registrationDate: 'Registration Date',
        // Messages
        profileUpdated: 'Profile updated successfully.',
        profileUpdateFailed: 'Failed to update profile.',
        passwordChanged: 'Password changed successfully.',
        passwordsNoMatch: 'New passwords do not match.',
        passwordTooShort: 'Password must be at least 6 characters.',
        wrongPassword: 'Current password is incorrect.',
        fillAllFields: 'Please fill in all fields.',
        emailUpdated: 'Email address updated.',
        emailChangeFailed: 'Failed to change email. Check your password.',
        privacyUpdated: 'Privacy settings updated.',
        privacyFailed: 'Failed to update privacy settings.',
        notificationFailed: 'Failed to update notification settings.',
        languageUpdated: 'Language preference updated.',
        languageFailed: 'Failed to update language preference.',
        deleteFailed: 'Failed to delete account.',
        loadingSettings: 'Loading settings...',
    },
    tr: {
        // Sidebar
        settingsTitle: 'Ayarlar',
        profileInfo: 'Profil Bilgileri',
        accountAccess: 'Hesap Erişimi',
        visibility: 'Görünürlük',
        notifications: 'Bildirimler',
        generalPreferences: 'Genel Tercihler',
        // Profile
        profileDesc: 'Ad, unvan ve kurum bilgilerinizi düzenleyin.',
        fullName: 'Ad Soyad',
        fullNamePlaceholder: 'Adınız Soyadınız',
        title: 'Unvan',
        titlePlaceholder: 'Prof. Dr., Arş. Gör., vb.',
        institution: 'Kurum',
        institutionPlaceholder: 'Üniversite veya Kurum',
        department: 'Bölüm',
        departmentPlaceholder: 'Bölüm veya Anabilim Dalı',
        bio: 'Biyografi',
        bioPlaceholder: 'Kendinizi kısaca tanıtın...',
        save: 'Kaydet',
        saving: 'Kaydediliyor...',
        verificationStatus: 'Doğrulama Durumu',
        verified: 'Doğrulanmış',
        unverified: 'Doğrulanmamış',
        verifiedDesc: 'Hesabınız akademik e-posta ile doğrulanmış.',
        unverifiedDesc: 'Hesabınızı doğrulamak için akademik e-posta adresinizi kullanın.',
        // Account
        emailAddress: 'E-posta Adresi',
        newEmail: 'Yeni E-posta',
        newEmailPlaceholder: 'yeni@email.edu.tr',
        currentPassword: 'Mevcut Şifre',
        currentPasswordPlaceholder: 'Güvenlik için şifrenizi girin',
        updateEmail: 'E-postayı Güncelle',
        updating: 'Güncelleniyor...',
        changePassword: 'Şifreyi Değiştir',
        currentPasswordLabel: 'Mevcut Şifre',
        currentPasswordFieldPlaceholder: 'Mevcut şifreniz',
        newPassword: 'Yeni Şifre',
        newPasswordPlaceholder: 'En az 6 karakter',
        confirmNewPassword: 'Yeni Şifre (Tekrar)',
        confirmPasswordPlaceholder: 'Yeni şifreyi tekrar girin',
        changing: 'Değiştiriliyor...',
        deleteAccount: 'Hesabı Sil',
        deleteAccountDesc: 'Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz.',
        deleteMyAccount: 'Hesabımı Sil',
        deleteConfirm: 'Bu işlem geri alınamaz. Emin misiniz?',
        yesDelete: 'Evet, Sil',
        deleting: 'Siliniyor...',
        cancel: 'İptal',
        // Privacy
        visibilityDesc: 'Profilinizin kimler tarafından görülebileceğini ayarlayın.',
        public: 'Herkese Açık',
        publicDesc: 'Herkes profilinizi görebilir.',
        connectionsOnly: 'Sadece Bağlantılar',
        connectionsOnlyDesc: 'Sadece bağlantılarınız görebilir.',
        private: 'Gizli',
        privateDesc: 'Profiliniz tamamen gizli.',
        // Notifications
        notificationsDesc: 'Bildirim tercihlerinizi yönetin.',
        pushNotifications: 'Uygulama Bildirimleri',
        pushNotificationsDesc: 'Yeni takipçi, yorum ve etkileşim bildirimleri',
        emailNotifications: 'E-posta Bildirimleri',
        emailNotificationsDesc: 'Önemli güncellemeleri e-posta ile alın',
        // Preferences
        preferencesDesc: 'Dil ve görünüm tercihlerinizi ayarlayın.',
        language: 'Dil',
        accountInformation: 'Hesap Bilgileri',
        registrationDate: 'Kayıt Tarihi',
        // Messages
        profileUpdated: 'Profil bilgileri güncellendi.',
        profileUpdateFailed: 'Profil güncellenirken hata oluştu.',
        passwordChanged: 'Şifre başarıyla değiştirildi.',
        passwordsNoMatch: 'Yeni şifreler eşleşmiyor.',
        passwordTooShort: 'Şifre en az 6 karakter olmalıdır.',
        wrongPassword: 'Mevcut şifre yanlış.',
        fillAllFields: 'Tüm alanları doldurun.',
        emailUpdated: 'E-posta adresi güncellendi.',
        emailChangeFailed: 'E-posta değiştirilemedi. Şifrenizi kontrol edin.',
        privacyUpdated: 'Gizlilik ayarları güncellendi.',
        privacyFailed: 'Gizlilik ayarları güncellenemedi.',
        notificationFailed: 'Bildirim ayarları güncellenemedi.',
        languageUpdated: 'Dil tercihi güncellendi.',
        languageFailed: 'Dil tercihi güncellenemedi.',
        deleteFailed: 'Hesap silinemedi.',
        loadingSettings: 'Ayarlar yükleniyor...',
    },
};

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

    // Current language
    const lang = settings?.language || 'en';
    const t = translations[lang] || translations['en'];

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
            showMessage('success', t.profileUpdated);
        } catch {
            showMessage('error', t.profileUpdateFailed);
        } finally {
            setSaving(false);
        }
    };

    // ==================== PASSWORD ====================
    const handlePasswordChange = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showMessage('error', t.passwordsNoMatch);
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            showMessage('error', t.passwordTooShort);
            return;
        }
        setSaving(true);
        try {
            await settingsApi.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            showMessage('success', t.passwordChanged);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch {
            showMessage('error', t.wrongPassword);
        } finally {
            setSaving(false);
        }
    };

    // ==================== EMAIL ====================
    const handleEmailChange = async () => {
        if (!emailForm.newEmail || !emailForm.password) {
            showMessage('error', t.fillAllFields);
            return;
        }
        setSaving(true);
        try {
            await settingsApi.changeEmail(emailForm);
            showMessage('success', t.emailUpdated);
            setEmailForm({ newEmail: '', password: '' });
            fetchSettings();
        } catch {
            showMessage('error', t.emailChangeFailed);
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
            showMessage('success', t.privacyUpdated);
        } catch {
            showMessage('error', t.privacyFailed);
        } finally {
            setSaving(false);
        }
    };

    // ==================== NOTIFICATIONS ====================
    const handleNotificationToggle = async (field: 'notificationsEnabled' | 'emailNotificationsEnabled') => {
        if (!settings) return;
        setSaving(true);
        const updated = {
            notificationsEnabled: settings.notificationsEnabled,
            emailNotificationsEnabled: settings.emailNotificationsEnabled,
            [field]: !settings[field],
        };
        try {
            const res = await settingsApi.updateNotifications(updated);
            setSettings(res.data);
        } catch {
            showMessage('error', t.notificationFailed);
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
            showMessage('success', translations[newLang]?.languageUpdated || 'Language updated.');
        } catch {
            showMessage('error', t.languageFailed);
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
            showMessage('error', t.deleteFailed);
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
                        <span>{t.loadingSettings}</span>
                    </div>
                </div>
            </>
        );
    }

    const sidebarItems: { key: SettingsSection; label: string }[] = [
        { key: 'profile', label: t.profileInfo },
        { key: 'account', label: t.accountAccess },
        { key: 'privacy', label: t.visibility },
        { key: 'notifications', label: t.notifications },
        { key: 'preferences', label: t.generalPreferences },
    ];

    const privacyOptions = [
        { level: 0, label: t.public, desc: t.publicDesc },
        { level: 1, label: t.connectionsOnly, desc: t.connectionsOnlyDesc },
        { level: 2, label: t.private, desc: t.privateDesc },
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
                        <h2 className="settings-sidebar-title">{t.settingsTitle}</h2>
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
                                <h3 className="settings-section-title">{t.profileInfo}</h3>
                                <p className="settings-section-desc">{t.profileDesc}</p>

                                <div className="settings-form">
                                    <div className="settings-field">
                                        <label>{t.fullName}</label>
                                        <input
                                            type="text"
                                            value={profileForm.fullName}
                                            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                                            placeholder={t.fullNamePlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.title}</label>
                                        <input
                                            type="text"
                                            value={profileForm.title}
                                            onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                                            placeholder={t.titlePlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.institution}</label>
                                        <input
                                            type="text"
                                            value={profileForm.institution}
                                            onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                                            placeholder={t.institutionPlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.department}</label>
                                        <input
                                            type="text"
                                            value={profileForm.department}
                                            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                                            placeholder={t.departmentPlaceholder}
                                        />
                                    </div>
                                    <div className="settings-field">
                                        <label>{t.bio}</label>
                                        <textarea
                                            value={profileForm.bio}
                                            onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                            placeholder={t.bioPlaceholder}
                                            rows={4}
                                        />
                                    </div>
                                    <button
                                        className="settings-save-btn"
                                        onClick={handleProfileSave}
                                        disabled={saving}
                                    >
                                        {saving ? t.saving : t.save}
                                    </button>
                                </div>

                                {/* Verification Status */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.verificationStatus}</span>
                                        <span className={`settings-badge ${settings?.isVerified ? 'verified' : 'unverified'}`}>
                                            {settings?.isVerified ? t.verified : t.unverified}
                                        </span>
                                    </div>
                                    <p className="settings-card-desc">
                                        {settings?.isVerified ? t.verifiedDesc : t.unverifiedDesc}
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* ==================== ACCOUNT ==================== */}
                        {activeSection === 'account' && (
                            <section className="settings-section">
                                <h3 className="settings-section-title">{t.accountAccess}</h3>

                                {/* Email */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.emailAddress}</span>
                                        <span className="settings-card-value">{settings?.email}</span>
                                    </div>
                                    <div className="settings-form compact">
                                        <div className="settings-field">
                                            <label>{t.newEmail}</label>
                                            <input
                                                type="email"
                                                value={emailForm.newEmail}
                                                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                                                placeholder={t.newEmailPlaceholder}
                                            />
                                        </div>
                                        <div className="settings-field">
                                            <label>{t.currentPassword}</label>
                                            <input
                                                type="password"
                                                value={emailForm.password}
                                                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                                                placeholder={t.currentPasswordPlaceholder}
                                            />
                                        </div>
                                        <button
                                            className="settings-save-btn secondary"
                                            onClick={handleEmailChange}
                                            disabled={saving}
                                        >
                                            {saving ? t.updating : t.updateEmail}
                                        </button>
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.changePassword}</span>
                                    </div>
                                    <div className="settings-form compact">
                                        <div className="settings-field">
                                            <label>{t.currentPasswordLabel}</label>
                                            <input
                                                type="password"
                                                value={passwordForm.currentPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                                placeholder={t.currentPasswordFieldPlaceholder}
                                            />
                                        </div>
                                        <div className="settings-field">
                                            <label>{t.newPassword}</label>
                                            <input
                                                type="password"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                placeholder={t.newPasswordPlaceholder}
                                            />
                                        </div>
                                        <div className="settings-field">
                                            <label>{t.confirmNewPassword}</label>
                                            <input
                                                type="password"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                placeholder={t.confirmPasswordPlaceholder}
                                            />
                                        </div>
                                        <button
                                            className="settings-save-btn secondary"
                                            onClick={handlePasswordChange}
                                            disabled={saving}
                                        >
                                            {saving ? t.changing : t.changePassword}
                                        </button>
                                    </div>
                                </div>

                                {/* Delete Account */}
                                <div className="settings-card danger">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.deleteAccount}</span>
                                    </div>
                                    <p className="settings-card-desc">{t.deleteAccountDesc}</p>
                                    {!showDeleteConfirm ? (
                                        <button
                                            className="settings-delete-btn"
                                            onClick={() => setShowDeleteConfirm(true)}
                                        >
                                            {t.deleteMyAccount}
                                        </button>
                                    ) : (
                                        <div className="settings-delete-confirm">
                                            <p>{t.deleteConfirm}</p>
                                            <div className="settings-delete-actions">
                                                <button
                                                    className="settings-delete-btn confirm"
                                                    onClick={handleDeleteAccount}
                                                    disabled={saving}
                                                >
                                                    {saving ? t.deleting : t.yesDelete}
                                                </button>
                                                <button
                                                    className="settings-cancel-btn"
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                >
                                                    {t.cancel}
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
                                <h3 className="settings-section-title">{t.visibility}</h3>
                                <p className="settings-section-desc">{t.visibilityDesc}</p>

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

                        {/* ==================== NOTIFICATIONS ==================== */}
                        {activeSection === 'notifications' && (
                            <section className="settings-section">
                                <h3 className="settings-section-title">{t.notifications}</h3>
                                <p className="settings-section-desc">{t.notificationsDesc}</p>

                                <div className="settings-toggle-list">
                                    <div className="settings-toggle-item">
                                        <div className="settings-toggle-info">
                                            <span className="settings-toggle-label">{t.pushNotifications}</span>
                                            <span className="settings-toggle-desc">{t.pushNotificationsDesc}</span>
                                        </div>
                                        <label className="settings-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings?.notificationsEnabled ?? true}
                                                onChange={() => handleNotificationToggle('notificationsEnabled')}
                                                disabled={saving}
                                            />
                                            <span className="settings-slider" />
                                        </label>
                                    </div>
                                    <div className="settings-toggle-item">
                                        <div className="settings-toggle-info">
                                            <span className="settings-toggle-label">{t.emailNotifications}</span>
                                            <span className="settings-toggle-desc">{t.emailNotificationsDesc}</span>
                                        </div>
                                        <label className="settings-switch">
                                            <input
                                                type="checkbox"
                                                checked={settings?.emailNotificationsEnabled ?? true}
                                                onChange={() => handleNotificationToggle('emailNotificationsEnabled')}
                                                disabled={saving}
                                            />
                                            <span className="settings-slider" />
                                        </label>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ==================== PREFERENCES ==================== */}
                        {activeSection === 'preferences' && (
                            <section className="settings-section">
                                <h3 className="settings-section-title">{t.generalPreferences}</h3>
                                <p className="settings-section-desc">{t.preferencesDesc}</p>

                                <div className="settings-card">
                                    <div className="settings-card-header">
                                        <span className="settings-card-title">{t.language}</span>
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
                                        <span className="settings-card-title">{t.accountInformation}</span>
                                    </div>
                                    <div className="settings-info-row">
                                        <span className="info-label">{t.registrationDate}</span>
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
