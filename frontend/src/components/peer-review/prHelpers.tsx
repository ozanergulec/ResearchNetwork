import React from 'react';
import { API_SERVER_URL } from '../../services/apiClient';

export const getImageUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
};

export const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const renderAvatar = (name: string, imageUrl?: string | null, size = 28) => {
    const url = getImageUrl(imageUrl);
    if (url) {
        return <img src={url} alt={name} className="pr-pub-author-avatar" style={{ width: size, height: size }} />;
    }
    return (
        <div className="pr-pub-author-initials" style={{ width: size, height: size, fontSize: size * 0.22 }}>
            {getInitials(name)}
        </div>
    );
};

export const renderStatus = (status: string) => (
    <span className={`pr-status pr-status-${status.toLowerCase()}`}>{status}</span>
);

export const renderVerdict = (verdict: string | null) => {
    if (!verdict) return null;
    const labels: Record<string, string> = {
        Approve: 'Approved',
        MinorRevision: 'Minor Revision',
        MajorRevision: 'Major Revision',
        Reject: 'Rejected'
    };
    return <span className={`pr-verdict pr-verdict-${verdict}`}>{labels[verdict] || verdict}</span>;
};
