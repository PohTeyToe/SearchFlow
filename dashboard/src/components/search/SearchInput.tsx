import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils';
import { Search, X } from 'lucide-react';
import { useDebounce } from '../../hooks';

interface SearchInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
    debounceMs?: number;
    isLoading?: boolean;
    className?: string;
    autoFocus?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value: controlledValue,
    onChange,
    onSearch,
    placeholder = 'Search...',
    debounceMs = 300,
    isLoading = false,
    className,
    autoFocus = false,
}) => {
    const [internalValue, setInternalValue] = useState(controlledValue || '');
    const value = controlledValue !== undefined ? controlledValue : internalValue;

    // Debounced value for search
    const debouncedValue = useDebounce(value, debounceMs);

    // Trigger search when debounced value changes
    useEffect(() => {
        onSearch?.(debouncedValue);
    }, [debouncedValue, onSearch]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        if (controlledValue === undefined) {
            setInternalValue(newValue);
        }
        onChange?.(newValue);
    }, [controlledValue, onChange]);

    const handleClear = useCallback(() => {
        if (controlledValue === undefined) {
            setInternalValue('');
        }
        onChange?.('');
        onSearch?.('');
    }, [controlledValue, onChange, onSearch]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            handleClear();
        }
    };

    return (
        <div className={cn('relative', className)}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                {isLoading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                ) : (
                    <Search className="h-4 w-4" />
                )}
            </div>
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className={cn(
                    'w-full pl-10 pr-10 py-2.5 rounded-lg border bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                    'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                    'transition-colors duration-200 text-sm'
                )}
            />
            {value && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
