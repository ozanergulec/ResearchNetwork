import React from 'react';
import '../../styles/common/FormInput.css';

interface FormInputProps {
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    required?: boolean;
    label?: string;
    multiline?: boolean;
    className?: string;
}

const FormInput: React.FC<FormInputProps> = ({
    type = 'text',
    placeholder,
    value,
    onChange,
    required = false,
    label,
    multiline = false,
    className = '',
}) => {
    const inputElement = multiline ? (
        <textarea
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className={`form-input form-textarea ${className}`}
        />
    ) : (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className={`form-input ${className}`}
        />
    );

    if (label) {
        return (
            <label className="form-label">
                {label}
                {inputElement}
            </label>
        );
    }

    return inputElement;
};

export default FormInput;
