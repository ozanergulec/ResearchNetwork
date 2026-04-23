import React, { useState } from 'react';
import type { Translations } from '../../translations/translations';
import type { UserSettings } from '../../services/settingsService';

export interface EmailFormState {
    newEmail: string;
    password: string;
}

export interface PasswordFormState {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface AccountSectionProps {
    settings: UserSettings | null;
    emailForm: EmailFormState;
    onEmailFormChange: (form: EmailFormState) => void;
    onEmailChange: () => void;
    passwordForm: PasswordFormState;
    onPasswordFormChange: (form: PasswordFormState) => void;
    onPasswordChange: () => void;
    onDeleteAccount: () => void;
    saving: boolean;
    t: Translations;
}

const AccountSection: React.FC<AccountSectionProps> = ({
    settings,
    emailForm,
    onEmailFormChange,
    onEmailChange,
    passwordForm,
    onPasswordFormChange,
    onPasswordChange,
    onDeleteAccount,
    saving,
    t,
}) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <section className="settings-section">
            <h3 className="settings-section-title">{t.settings.accountAccess}</h3>

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
                            onChange={(e) => onEmailFormChange({ ...emailForm, newEmail: e.target.value })}
                            placeholder={t.settings.newEmailPlaceholder}
                        />
                    </div>
                    <div className="settings-field">
                        <label>{t.settings.currentPassword}</label>
                        <input
                            type="password"
                            value={emailForm.password}
                            onChange={(e) => onEmailFormChange({ ...emailForm, password: e.target.value })}
                            placeholder={t.settings.currentPasswordPlaceholder}
                        />
                    </div>
                    <button
                        className="settings-save-btn secondary"
                        onClick={onEmailChange}
                        disabled={saving}
                    >
                        {saving ? t.settings.updating : t.settings.updateEmail}
                    </button>
                </div>
            </div>

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
                            onChange={(e) => onPasswordFormChange({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder={t.settings.currentPasswordFieldPlaceholder}
                        />
                    </div>
                    <div className="settings-field">
                        <label>{t.settings.newPassword}</label>
                        <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => onPasswordFormChange({ ...passwordForm, newPassword: e.target.value })}
                            placeholder={t.settings.newPasswordPlaceholder}
                        />
                    </div>
                    <div className="settings-field">
                        <label>{t.settings.confirmNewPassword}</label>
                        <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => onPasswordFormChange({ ...passwordForm, confirmPassword: e.target.value })}
                            placeholder={t.settings.confirmPasswordPlaceholder}
                        />
                    </div>
                    <button
                        className="settings-save-btn secondary"
                        onClick={onPasswordChange}
                        disabled={saving}
                    >
                        {saving ? t.settings.changing : t.settings.changePassword}
                    </button>
                </div>
            </div>

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
                                onClick={onDeleteAccount}
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
    );
};

export default AccountSection;
