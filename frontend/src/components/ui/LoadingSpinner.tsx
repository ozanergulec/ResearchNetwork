import React from 'react';
import './LoadingSpinner.css';

export interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = 'Loading...'
}) => {
    return (
        <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );
};

export default LoadingSpinner;
