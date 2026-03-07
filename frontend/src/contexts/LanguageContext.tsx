import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../services/settingsService';

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    loading: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    loading: true,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<string>('en');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        const fetchLanguage = async () => {
            try {
                const res = await settingsApi.getSettings();
                setLanguageState(res.data.language || 'en');
            } catch {
                // Fallback to English
            } finally {
                setLoading(false);
            }
        };

        fetchLanguage();
    }, []);

    const setLanguage = useCallback((lang: string) => {
        setLanguageState(lang);
    }, []);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, loading }}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageContext;
