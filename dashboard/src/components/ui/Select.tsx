import React, { forwardRef } from 'react';
import { cn } from '../../utils';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
    label?: string;
    options: SelectOption[];
    error?: string;
    helperText?: string;
    onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, options, error, helperText, className, id, onChange, ...props }, ref) => {
        const selectId = id || `select-${Math.random().toString(36).slice(2)}`;

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.(e.target.value);
        };

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        onChange={handleChange}
                        className={cn(
                            'w-full appearance-none rounded-lg border bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] transition-colors duration-200',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
                            'pl-3 pr-10 py-2 text-sm cursor-pointer',
                            error
                                ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
                            props.disabled && 'opacity-50 cursor-not-allowed bg-[var(--color-bg-secondary)]',
                            className
                        )}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value} disabled={option.disabled}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
                </div>
                {(error || helperText) && (
                    <p
                        className={cn(
                            'mt-1.5 text-xs',
                            error ? 'text-red-500' : 'text-[var(--color-text-secondary)]'
                        )}
                    >
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);

Select.displayName = 'Select';
