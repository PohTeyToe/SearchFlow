import React from 'react';
import { cn } from '../../utils';
import { AlertCircle, CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

interface AlertProps {
    children: React.ReactNode;
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    className?: string;
    dismissible?: boolean;
    onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
    children,
    variant = 'info',
    title,
    className,
    dismissible = false,
    onDismiss,
}) => {
    const variants = {
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
        error: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
    };

    const icons = {
        info: Info,
        success: CheckCircle,
        warning: AlertTriangle,
        error: AlertCircle,
    };

    const Icon = icons[variant];

    return (
        <div
            className={cn(
                'flex gap-3 p-4 rounded-lg border',
                variants[variant],
                className
            )}
            role="alert"
        >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                {title && <div className="font-medium mb-1">{title}</div>}
                <div className="text-sm opacity-90">{children}</div>
            </div>
            {dismissible && onDismiss && (
                <button
                    onClick={onDismiss}
                    className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};
