import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    id,
    ...props
}) => {
    const inputId = id || `input-${props.name || Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="input-wrapper">
            {label && (
                <label htmlFor={inputId} className="input-label">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`input-field ${error ? 'input-error' : ''} ${className}`}
                {...props}
            />
            {error && <span className="input-error-text">{error}</span>}
        </div>
    );
};

export default Input;
