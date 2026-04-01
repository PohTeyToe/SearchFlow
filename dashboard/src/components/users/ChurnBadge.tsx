import React from 'react';
import { cn } from '../../utils';

interface ChurnBadgeProps {
    probability: number;
    size?: 'sm' | 'md' | 'lg';
}

export const ChurnBadge: React.FC<ChurnBadgeProps> = ({ probability, size = 'md' }) => {
    const pct = Math.round(probability * 100);
    const riskLevel = pct < 30 ? 'low' : pct < 70 ? 'medium' : 'high';

    const colors = {
        low: 'bg-emerald-500/10 text-emerald-500',
        medium: 'bg-amber-500/10 text-amber-500',
        high: 'bg-red-500/10 text-red-500',
    };

    const dotColors = {
        low: 'bg-emerald-500',
        medium: 'bg-amber-500',
        high: 'bg-red-500',
    };

    const sizes = {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 font-semibold rounded-full',
                colors[riskLevel],
                sizes[size]
            )}
        >
            <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[riskLevel])} />
            {pct}%
        </span>
    );
};
