import React from 'react';
import type { Translations } from '../../translations/translations';
import type { UserSettings } from '../../services/settingsService';

const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Türkçe' },
];

interface PreferencesSectionProps {
    settings: UserSettings | null;
    onLanguageChange: (lang: string) => void;
    saving: boolean;
    t: Translations;
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
    settings,
    onLanguageChange,
    saving,
    t,
}) => {
    const lang = settings?.language || 'en';
    const dateLocale = lang === 'tr' ? 'tr-TR' : 'en-US';

    return (
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
                            onClick={() => onLanguageChange(langOpt.value)}
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
    );
};

export default PreferencesSection;
