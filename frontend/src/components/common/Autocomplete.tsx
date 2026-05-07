import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import '../../styles/components/Autocomplete.css';

interface AutocompleteProps {
    suggestions: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
    /** When true, only values that exactly match an item in `suggestions` are accepted. */
    strict?: boolean;
    /** Custom error message shown when strict validation fails. */
    invalidMessage?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
    suggestions,
    value,
    onChange,
    placeholder = '',
    required = false,
    className = '',
    strict = false,
    invalidMessage = 'Please select a value from the list',
}) => {
    const [filtered, setFiltered] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [touched, setTouched] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [inputValue, setInputValue] = useState(value);

    const suggestionSet = useMemo(
        () => new Set(suggestions.map(s => s.toLowerCase())),
        [suggestions]
    );

    const isInvalid = strict && touched && inputValue.length > 0 && !suggestionSet.has(inputValue.toLowerCase());

    // Sync external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Apply native form validity for strict mode
    useEffect(() => {
        if (!inputRef.current) return;
        if (strict && inputValue.length > 0 && !suggestionSet.has(inputValue.toLowerCase())) {
            inputRef.current.setCustomValidity(invalidMessage);
        } else {
            inputRef.current.setCustomValidity('');
        }
    }, [strict, inputValue, suggestionSet, invalidMessage]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeItem = listRef.current.children[activeIndex] as HTMLElement;
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    const filterSuggestions = useCallback((input: string) => {
        if (input.length > 0) {
            const matches = suggestions.filter((s) =>
                s.toLowerCase().includes(input.toLowerCase())
            );
            setFiltered(matches.slice(0, 20));
            setIsOpen(matches.length > 0);
        } else {
            setFiltered([]);
            setIsOpen(false);
        }
    }, [suggestions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        setInputValue(input);
        onChange(input);
        filterSuggestions(input);
        setActiveIndex(-1);
    };

    const handleSelect = (item: string) => {
        setInputValue(item);
        onChange(item);
        setIsOpen(false);
        setFiltered([]);
        setActiveIndex(-1);
        setTouched(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(filtered[activeIndex]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleFocus = () => {
        if (inputValue.length > 0) {
            filterSuggestions(inputValue);
        }
    };

    const handleBlur = () => {
        setTouched(true);
    };

    return (
        <div className="autocomplete-wrapper" ref={wrapperRef}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                required={required}
                className={`login-input ${className} ${isInvalid ? 'input-error' : ''}`}
                autoComplete="off"
            />
            {isInvalid && (
                <span className="input-error-text">{invalidMessage}</span>
            )}
            {isOpen && filtered.length > 0 && (
                <ul className="autocomplete-list" ref={listRef}>
                    {filtered.map((item, index) => (
                        <li
                            key={item}
                            className={`autocomplete-item ${index === activeIndex ? 'autocomplete-item-active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(item);
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Autocomplete;
