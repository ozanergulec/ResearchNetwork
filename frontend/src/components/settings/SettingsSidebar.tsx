import React, { memo } from 'react';
import type { Translations } from '../../translations/translations';

export type SettingsSection = 'profile' | 'account' | 'privacy';

interface SettingsSidebarProps {
    activeSection: SettingsSection;
    onSectionChange: (section: SettingsSection) => void;
    t: Translations;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeSection, onSectionChange, t }) => {
    const sidebarItems: { key: SettingsSection; label: string }[] = [
        { key: 'profile', label: t.settings.profileInfo },
        { key: 'account', label: t.settings.accountAccess },
        { key: 'privacy', label: t.settings.visibility },
    ];

    return (
        <aside className="settings-sidebar">
            <h2 className="settings-sidebar-title">{t.settings.settingsTitle}</h2>
            <nav className="settings-nav">
                {sidebarItems.map((item) => (
                    <button
                        key={item.key}
                        className={`settings-nav-item ${activeSection === item.key ? 'active' : ''}`}
                        onClick={() => onSectionChange(item.key)}
                    >
                        <span className="settings-nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default memo(SettingsSidebar);
