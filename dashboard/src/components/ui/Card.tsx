import React from 'react';
import { cn } from '../../utils';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    padding = 'md',
    hover = false,
    onClick,
}) => {
    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    const Component = onClick ? 'button' : 'div';

    return (
        <Component
            onClick={onClick}
            className={cn(
                'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl text-left w-full',
                paddings[padding],
                hover && 'hover:border-[var(--color-border-hover)] transition-colors duration-200',
                onClick && 'cursor-pointer',
                className
            )}
        >
            {children}
        </Component>
    );
};

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, action }) => (
    <div className={cn('flex items-center justify-between mb-4', className)}>
        <div className="font-semibold text-[var(--color-text-primary)]">{children}</div>
        {action}
    </div>
);

interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className }) => (
    <div className={cn(className)}>{children}</div>
);

interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
    <div className={cn('mt-4 pt-4 border-t border-[var(--color-border)]', className)}>
        {children}
    </div>
);
