import React from 'react';
import { cn } from '../../utils';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    description?: string;
    onChange?: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    label,
    description,
    className,
    id,
    checked,
    onChange,
    disabled,
    ...props
}) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2)}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.checked);
    };

    return (
        <div className={cn('flex items-start gap-3', className)}>
            <div className="flex items-center h-5">
                <div className="relative">
                    <input
                        type="checkbox"
                        id={checkboxId}
                        checked={checked}
                        onChange={handleChange}
                        disabled={disabled}
                        className="peer sr-only"
                        {...props}
                    />
                    <div
                        className={cn(
                            'w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center',
                            'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/50',
                            checked
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]',
                            disabled && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                </div>
            </div>
            {(label || description) && (
                <label
                    htmlFor={checkboxId}
                    className={cn(
                        'flex flex-col cursor-pointer',
                        disabled && 'opacity-50 cursor-not-allowed'
                    )}
                >
                    {label && (
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
                    )}
                    {description && (
                        <span className="text-xs text-[var(--color-text-secondary)]">{description}</span>
                    )}
                </label>
            )}
        </div>
    );
};
