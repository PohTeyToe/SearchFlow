import React from 'react';
import { cn } from '../../utils';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className,
}) => (
    <div
        className={cn(
            'flex flex-col items-center justify-center py-12 px-4 text-center',
            className
        )}
    >
        <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
            {icon || <Inbox className="w-6 h-6 text-[var(--color-text-muted)]" />}
        </div>
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-1">{title}</h3>
        {description && (
            <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-4">{description}</p>
        )}
        {action && (
            <Button variant="primary" size="sm" onClick={action.onClick}>
                {action.label}
            </Button>
        )}
    </div>
);
