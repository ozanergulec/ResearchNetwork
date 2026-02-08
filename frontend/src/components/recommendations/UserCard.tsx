import React from 'react';
import Avatar from '../common/Avatar';
import type { User } from '../../services/userService';
import '../../styles/Components.css';

interface UserCardProps {
    user: User;
    onConnect?: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onConnect }) => {
    return (
        <div className="user-card">
            <Avatar name={user.fullName} size="medium" />
            <h3 className="user-card-name">{user.fullName}</h3>
            <p className="user-card-title">{user.title || 'Researcher'}</p>
            <p className="user-card-institution">{user.institution || 'No institution'}</p>
            {onConnect && (
                <button className="user-card-connect-button" onClick={onConnect}>
                    Connect
                </button>
            )}
        </div>
    );
};

export default UserCard;
