import React from 'react';
import './Card.css';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'elevated';
}

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    variant = 'default'
}) => {
    return (
        <div className={`card card-${variant} ${className}`}>
            {children}
        </div>
    );
};

export default Card;
