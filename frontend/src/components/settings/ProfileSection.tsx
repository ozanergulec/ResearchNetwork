import React from 'react';
import type { Translations } from '../../translations/translations';
import type { UserSettings } from '../../services/settingsService';

export interface ProfileFormState {
    fullName: string;
    title: string;
    institution: string;
    department: string;
    bio: string;
}

interface ProfileSectionProps {
    profileForm: ProfileFormState;
    onProfileFormChange: (form: ProfileFormState) => void;
    onSave: () => void;
    saving: boolean;
    settings: UserSettings | null;
    t: Translations;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
    profileForm,
    onProfileFormChange,
    onSave,
    saving,
    settings,
    t,
}) => {
    const updateField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
        onProfileFormChange({ ...profileForm, [key]: value });
    };

    return (
        <section className="settings-section">
            <h3 className="settings-section-title">{t.settings.profileInfo}</h3>
            <p className="settings-section-desc">{t.settings.profileDesc}</p>

            <div className="settings-form">
                <div className="settings-field">
                    <label>{t.settings.fullName}</label>
                    <input
                        type="text"
                        value={profileForm.fullName}
                        onChange={(e) => updateField('fullName', e.target.value)}
                        placeholder={t.settings.fullNamePlaceholder}
                    />
                </div>
                <div className="settings-field">
                    <label>{t.settings.title}</label>
                    <input
                        type="text"
                        value={profileForm.title}
                        onChange={(e) => updateField('title', e.target.value)}
                        placeholder={t.settings.titlePlaceholder}
                    />
                </div>
                <div className="settings-field">
                    <label>{t.settings.institution}</label>
                    <input
                        type="text"
                        value={profileForm.institution}
                        onChange={(e) => updateField('institution', e.target.value)}
                        placeholder={t.settings.institutionPlaceholder}
                    />
                </div>
                <div className="settings-field">
                    <label>{t.settings.department}</label>
                    <input
                        type="text"
                        value={profileForm.department}
                        onChange={(e) => updateField('department', e.target.value)}
                        placeholder={t.settings.departmentPlaceholder}
                    />
                </div>
                <div className="settings-field">
                    <label>{t.settings.bio}</label>
                    <textarea
                        value={profileForm.bio}
                        onChange={(e) => updateField('bio', e.target.value)}
                        placeholder={t.settings.bioPlaceholder}
                        rows={4}
                    />
                </div>
                <button
                    className="settings-save-btn"
                    onClick={onSave}
                    disabled={saving}
                >
                    {saving ? t.settings.saving : t.settings.save}
                </button>
            </div>

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
    );
};

export default ProfileSection;
