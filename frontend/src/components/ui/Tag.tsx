import React from 'react';
import './Tag.css';

export interface TagProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary';
}

const Tag: React.FC<TagProps> = ({
    children,
    variant = 'default'
}) => {
    return (
        <span className={`tag tag-${variant}`}>
            {children}
        </span>
    );
};

export default Tag;
