import React from 'react';
import { Avatar, Button, Tag, Card } from '../../ui';
import type { User } from '../../../services/api';
import './RecommendationsComponents.css';

export interface ResearcherCardProps {
    user: User;
    onConnect?: (user: User) => void;
}

const ResearcherCard: React.FC<ResearcherCardProps> = ({ user, onConnect }) => {
    return (
        <Card className="researcher-card">
            <Avatar name={user.fullName} size="medium" />
            <h3 className="researcher-card-name">{user.fullName}</h3>
            <p className="researcher-card-title">{user.title || 'Researcher'}</p>
            <p className="researcher-card-institution">{user.institution || 'No institution'}</p>
            {user.interestTags.length > 0 && (
                <div className="researcher-tags">
                    {user.interestTags.slice(0, 3).map((tag, i) => (
                        <Tag key={i} variant="primary">{tag}</Tag>
                    ))}
                </div>
            )}
            <Button
                onClick={() => onConnect?.(user)}
                variant="primary"
                fullWidth
            >
                Connect
            </Button>
        </Card>
    );
};

export default ResearcherCard;
