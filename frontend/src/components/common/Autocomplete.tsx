import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../../styles/components/Autocomplete.css';

interface AutocompleteProps {
    suggestions: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
    suggestions,
    value,
    onChange,
    placeholder = '',
    required = false,
    className = '',
}) => {
    const [filtered, setFiltered] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [inputValue, setInputValue] = useState(value);

    // Sync external value changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

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

    return (
        <div className="autocomplete-wrapper" ref={wrapperRef}>
            <input
                type="text"
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                placeholder={placeholder}
                required={required}
                className={`login-input ${className}`}
                autoComplete="off"
            />
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
