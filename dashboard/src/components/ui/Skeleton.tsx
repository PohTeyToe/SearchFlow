import React from 'react';
import { cn } from '../../utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className,
    variant = 'text',
    width,
    height,
}) => {
    const variants = {
        text: 'rounded h-4',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };

    const style: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    return (
        <div
            className={cn(
                'animate-pulse bg-[var(--color-border)]',
                variants[variant],
                className
            )}
            style={style}
        />
    );
};

interface SkeletonCardProps {
    lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3 }) => (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-4">
        <Skeleton className="h-5 w-1/3 mb-4" />
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className={cn('h-4 mb-2', i === lines - 1 && 'w-2/3')} />
        ))}
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <div className="space-y-2">
        <div className="flex gap-4 p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
            {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 flex-1" />
            ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 p-3">
                {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                ))}
            </div>
        ))}
    </div>
);
