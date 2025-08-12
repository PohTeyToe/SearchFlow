import React from 'react';
import { cn } from '../../utils';
import { Card } from '../ui/Card';

interface ChartContainerProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    isLoading?: boolean;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
    title,
    subtitle,
    children,
    action,
    className,
    isLoading = false,
}) => {
    return (
        <Card className={cn('relative', className)}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
                    {subtitle && (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>
                    )}
                </div>
                {action}
            </div>
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : (
                children
            )}
        </Card>
    );
};
