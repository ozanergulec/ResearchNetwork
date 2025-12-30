import React from 'react';
import './RecommendationsComponents.css';

export interface EmptyStateProps {
    icon?: string;
    title: string;
    message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon = '👥',
    title,
    message
}) => {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3 className="empty-state-title">{title}</h3>
            <p className="empty-state-message">{message}</p>
        </div>
    );
};

export default EmptyState;
