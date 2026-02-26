import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { notificationApi, type NotificationData } from '../services/notificationService';
import { API_SERVER_URL } from '../services/apiClient';
import '../styles/pages/NotificationsPage.css';

const NotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await notificationApi.getNotifications();
            setNotifications(res.data);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
            setError('Error loading notifications.');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const handleNotificationClick = async (notification: NotificationData) => {
        if (!notification.isRead) {
            try {
                await notificationApi.markAsRead(notification.id);
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
                );
            } catch (err) {
                console.error('Failed to mark as read', err);
            }
        }
        if (notification.targetUrl) {
            navigate(notification.targetUrl);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await notificationApi.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to delete notification', err);
        }
    };

    const getTimeAgo = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString('en-US');
    };

    const getNotificationIcon = (type: number): string => {
        switch (type) {
            case 1: return ''; // NewFollower
            case 3: return ''; // PublicationAlert (share)
            case 5: return ''; // PublicationRated
            case 6: return ''; // PublicationCited
            default: return ''; // General
        }
    };

    const groupNotifications = (list: NotificationData[]) => {
        const today: NotificationData[] = [];
        const thisWeek: NotificationData[] = [];
        const earlier: NotificationData[] = [];

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        for (const n of list) {
            const d = new Date(n.createdAt);
            if (d >= startOfToday) {
                today.push(n);
            } else if (d >= startOfWeek) {
                thisWeek.push(n);
            } else {
                earlier.push(n);
            }
        }

        return { today, thisWeek, earlier };
    };

    const getImageUrl = (url?: string | null) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_SERVER_URL}${url}`;
    };

    const getInitials = (name: string) =>
        name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const { today, thisWeek, earlier } = groupNotifications(notifications);

    const renderNotification = (n: NotificationData) => (
        <div
            key={n.id}
            className={`notif-card ${!n.isRead ? 'notif-unread' : ''}`}
            onClick={() => handleNotificationClick(n)}
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
                onClick={(e) => handleDelete(e, n.id)}
                title="Delete"
            >
                ×
            </button>
        </div>
    );

    const renderGroup = (title: string, items: NotificationData[]) => {
        if (items.length === 0) return null;
        return (
            <div className="notif-group">
                <h3 className="notif-group-title">{title}</h3>
                {items.map(renderNotification)}
            </div>
        );
    };

    return (
        <div className="notifications-page">
            <Navbar currentPage="notifications" />
            <div className="notif-container">
                <div className="notif-header">
                    <div className="notif-header-left">
                        <h1 className="notif-title">Notifications</h1>
                        {unreadCount > 0 && (
                            <span className="notif-unread-badge">{unreadCount} unread</span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="notif-mark-all-btn"
                            onClick={handleMarkAllAsRead}
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="notif-loading">
                        <div className="notif-spinner" />
                        <span>Loading...</span>
                    </div>
                ) : error ? (
                    <div className="notif-error">{error}</div>
                ) : notifications.length === 0 ? (
                    <div className="notif-empty">
                        <h3>No notifications yet</h3>
                        <p>Follow, rating, and share notifications will appear here.</p>
                    </div>
                ) : (
                    <div className="notif-list">
                        {renderGroup('Today', today)}
                        {renderGroup('This Week', thisWeek)}
                        {renderGroup('Earlier', earlier)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
