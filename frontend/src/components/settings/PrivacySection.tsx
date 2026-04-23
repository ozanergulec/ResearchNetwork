import React from 'react';
import type { Translations } from '../../translations/translations';
import type { UserSettings } from '../../services/settingsService';

interface PrivacySectionProps {
    settings: UserSettings | null;
    onPrivacyChange: (level: number) => void;
    saving: boolean;
    t: Translations;
}

const PrivacySection: React.FC<PrivacySectionProps> = ({ settings, onPrivacyChange, saving, t }) => {
    const privacyOptions = [
        { level: 0, label: t.settings.public, desc: t.settings.publicDesc },
        { level: 1, label: t.settings.connectionsOnly, desc: t.settings.connectionsOnlyDesc },
        { level: 2, label: t.settings.private, desc: t.settings.privateDesc },
    ];

    return (
        <section className="settings-section">
            <h3 className="settings-section-title">{t.settings.visibility}</h3>
            <p className="settings-section-desc">{t.settings.visibilityDesc}</p>

            <div className="settings-privacy-options">
                {privacyOptions.map((opt) => (
                    <button
                        key={opt.level}
                        className={`settings-privacy-option ${settings?.privacyLevel === opt.level ? 'active' : ''}`}
                        onClick={() => onPrivacyChange(opt.level)}
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
    );
};

export default PrivacySection;
