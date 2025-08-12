import React from 'react';
import { cn } from '../../utils';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    };

    return (
        <svg
            className={cn('animate-spin text-blue-500', sizes[size], className)}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
};

interface LoadingOverlayProps {
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => (
    <div className="absolute inset-0 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="text-sm text-[var(--color-text-secondary)]">{message}</span>
        </div>
    </div>
);
