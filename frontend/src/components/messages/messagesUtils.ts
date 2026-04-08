import { API_SERVER_URL } from '../../services/apiClient';
import type { Translations } from '../../translations/translations';

export const getImageUrl = (url?: string | null): string | null => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
};

export const getInitials = (name: string): string =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const formatTimeTranslated = (dateStr: string, t: Translations): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return t.messages.justNow;
    if (diffMin < 60) return `${diffMin}${t.messages.minutesAgo}`;
    if (diffHour < 24) return `${diffHour}${t.messages.hoursAgo}`;
    if (diffDay < 7) return `${diffDay}${t.messages.daysAgo}`;
    return date.toLocaleDateString();
};

export const formatMessageTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
