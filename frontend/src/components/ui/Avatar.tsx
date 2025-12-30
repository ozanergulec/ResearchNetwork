import React from 'react';
import './Avatar.css';

export interface AvatarProps {
    name: string;
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
    name,
    size = 'medium',
    className = ''
}) => {
    const initial = name.charAt(0).toUpperCase();

    return (
        <div className={`avatar avatar-${size} ${className}`}>
            {initial}
        </div>
    );
};

export default Avatar;
