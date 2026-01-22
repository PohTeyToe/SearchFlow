import React from 'react';
import { cn } from '../../utils';

interface ProgressBarProps {
    value: number;
    max?: number;
    variant?: 'default' | 'success' | 'warning' | 'error';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    variant = 'default',
    size = 'md',
    showLabel = false,
    className,
}) => {
    const percentage = Math.min((value / max) * 100, 100);

    const variants = {
        default: 'bg-blue-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
    };

    const sizes = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
    };

    return (
        <div className={cn('w-full', className)}>
            {showLabel && (
                <div className="flex justify-between text-sm text-[var(--color-text-secondary)] mb-1">
                    <span>Progress</span>
                    <span>{percentage.toFixed(0)}%</span>
                </div>
            )}
            <div className={cn('w-full bg-[var(--color-border)] rounded-full overflow-hidden', sizes[size])}>
                <div
                    className={cn('h-full rounded-full transition-all duration-500 ease-out', variants[variant])}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                />
            </div>
        </div>
    );
};
