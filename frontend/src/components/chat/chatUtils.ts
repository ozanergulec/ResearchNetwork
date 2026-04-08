import { API_SERVER_URL } from '../../services/apiClient';

export const getImageUrl = (url?: string | null): string | null => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
};

export const getInitials = (name: string): string =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '0m';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
