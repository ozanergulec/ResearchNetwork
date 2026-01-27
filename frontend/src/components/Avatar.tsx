import React from 'react';
import '../styles/Components.css';

interface AvatarProps {
    name: string;
    size?: 'small' | 'medium' | 'large';
}

const Avatar: React.FC<AvatarProps> = ({ name, size = 'medium' }) => {
    const initial = name.charAt(0).toUpperCase();

    return (
        <div className={`avatar avatar-${size}`}>
            {initial}
        </div>
    );
};

export default Avatar;
