import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { HomeProfileSidebar } from '../components/feed';
import { notificationApi, type NotificationData } from '../services/notificationService';
import { API_SERVER_URL } from '../services/apiClient';
import { useTranslation } from '../translations/translations';
import '../styles/pages/NotificationsPage.css';

const getImageUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
};

const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

interface NotificationCardProps {
    notification: NotificationData;
    onClick: (n: NotificationData) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
    getTimeAgo: (dateStr: string) => string;
    getNotificationIcon: (type: number) => string;
}

const NotificationCard = React.memo<NotificationCardProps>(
    ({ notification: n, onClick, onDelete, getTimeAgo, getNotificationIcon }) => (
        <div
            className={`notif-card ${!n.isRead ? 'notif-unread' : ''}`}
            onClick={() => onClick(n)}
        >
            <div className="notif-icon-wrapper">
                {n.actorProfileImageUrl ? (
                    <img
                        src={getImageUrl(n.actorProfileImageUrl)!}
                        alt={n.actorName || ''}
                        className="notif-actor-avatar"
                    />
                ) : n.actorName ? (
                    <div className="notif-actor-initials">
                        {getInitials(n.actorName)}
                    </div>
                ) : (
                    <div className="notif-type-icon">
                        {getNotificationIcon(n.type)}
                    </div>
                )}
                {!n.isRead && <span className="notif-unread-dot" />}
            </div>
            <div className="notif-content">
                <p className="notif-message">{n.message}</p>
                <span className="notif-time">{getTimeAgo(n.createdAt)}</span>
            </div>
            <button
                className="notif-delete-btn"
                onClick={(e) => onDelete(e, n.id)}
                title="Delete"
            >
                ×
            </button>
        </div>
    )
);

const NotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const t = useTranslation();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                setLoading(true);
                const res = await notificationApi.getNotifications();
                setNotifications(res.data);
            } catch (err) {
                console.error('Failed to fetch notifications', err);
                setError(t.notifications.errorLoading);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    // Dispatch custom event to update Navbar badge immediately
    const dispatchUnreadCount = useCallback((count: number) => {
        window.dispatchEvent(new CustomEvent('notificationCountUpdated', { detail: count }));
    }, []);

    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            dispatchUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    }, [dispatchUnreadCount]);

    const handleNotificationClick = useCallback(async (notification: NotificationData) => {
        if (!notification.isRead) {
            try {
                await notificationApi.markAsRead(notification.id);
                setNotifications(prev => {
                    const updated = prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n);
                    dispatchUnreadCount(updated.filter(n => !n.isRead).length);
                    return updated;
                });
            } catch (err) {
                console.error('Failed to mark as read', err);
            }
        }
        if (notification.targetUrl) {
            navigate(notification.targetUrl);
        }
    }, [navigate, dispatchUnreadCount]);

    const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await notificationApi.deleteNotification(id);
            setNotifications(prev => {
                const updated = prev.filter(n => n.id !== id);
                dispatchUnreadCount(updated.filter(n => !n.isRead).length);
                return updated;
            });
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    }, [dispatchUnreadCount]);

    const getTimeAgo = useCallback((dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return t.notifications.justNow;
        if (diffMin < 60) return `${diffMin}${t.notifications.minutesAgo}`;
        if (diffHour < 24) return `${diffHour}${t.notifications.hoursAgo}`;
        if (diffDay < 7) return `${diffDay}${t.notifications.daysAgo}`;
        return date.toLocaleDateString('en-US');
    }, [t]);

    const getNotificationIcon = useCallback((type: number): string => {
        switch (type) {
            case 1: return ''; // NewFollower
            case 3: return ''; // PublicationAlert (share)
            case 5: return ''; // PublicationRated
            case 6: return ''; // PublicationCited
            default: return ''; // General
        }
    }, []);

    const unreadCount = useMemo(
        () => notifications.filter(n => !n.isRead).length,
        [notifications]
    );

    const { today, thisWeek, earlier } = useMemo(() => {
        const todayArr: NotificationData[] = [];
        const thisWeekArr: NotificationData[] = [];
        const earlierArr: NotificationData[] = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        for (const n of notifications) {
            const d = new Date(n.createdAt);
            if (d >= startOfToday) {
                todayArr.push(n);
            } else if (d >= startOfWeek) {
                thisWeekArr.push(n);
            } else {
                earlierArr.push(n);
            }
        }

        return { today: todayArr, thisWeek: thisWeekArr, earlier: earlierArr };
    }, [notifications]);

    const renderGroup = (title: string, items: NotificationData[]) => {
        if (items.length === 0) return null;
        return (
            <div className="notif-group">
                <h3 className="notif-group-title">{title}</h3>
                {items.map(n => (
                    <NotificationCard
                        key={n.id}
                        notification={n}
                        onClick={handleNotificationClick}
                        onDelete={handleDelete}
                        getTimeAgo={getTimeAgo}
                        getNotificationIcon={getNotificationIcon}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="notifications-page">
            <Navbar currentPage="notifications" />
            <div className="notif-layout">
                <div className="notif-sidebar">
                    <HomeProfileSidebar />
                </div>
                <div className="notif-container">
                    <div className="notif-header">
                        <div className="notif-header-left">
                            <h1 className="notif-title">{t.notifications.title}</h1>
                            {unreadCount > 0 && (
                                <span className="notif-unread-badge">{unreadCount} {t.notifications.unread}</span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                className="notif-mark-all-btn"
                                onClick={handleMarkAllAsRead}
                            >
                                {t.notifications.markAllAsRead}
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="notif-loading">
                            <div className="notif-spinner" />
                            <span>{t.notifications.loading}</span>
                        </div>
                    ) : error ? (
                        <div className="notif-error">{error}</div>
                    ) : notifications.length === 0 ? (
                        <div className="notif-empty">
                            <h3>{t.notifications.noNotifications}</h3>
                            <p>{t.notifications.noNotificationsDesc}</p>
                        </div>
                    ) : (
                        <div className="notif-list">
                            {renderGroup(t.notifications.today, today)}
                            {renderGroup(t.notifications.thisWeek, thisWeek)}
                            {renderGroup(t.notifications.earlier, earlier)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
