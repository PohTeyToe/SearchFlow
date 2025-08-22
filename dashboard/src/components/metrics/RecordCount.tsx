import React from 'react';
import { cn, formatNumber } from '../../utils';
import type { RecordCount } from '../../types';
import { TrendingUp, TrendingDown, Minus, Database } from 'lucide-react';

interface RecordCountDisplayProps {
    data: RecordCount;
    className?: string;
}

export const RecordCountDisplay: React.FC<RecordCountDisplayProps> = ({
    data,
    className,
}) => {
    const getTrendIcon = () => {
        if (data.deltaPercent > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
        if (data.deltaPercent < 0) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
        return <Minus className="w-3.5 h-3.5 text-gray-400" />;
    };

    return (
        <div
            className={cn(
                'flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg',
                className
            )}
        >
            <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{data.table}</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--color-text-secondary)]">
                    {formatNumber(data.count)}
                </span>
                <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span
                        className={cn(
                            'text-xs',
                            data.deltaPercent > 0 && 'text-emerald-500',
                            data.deltaPercent < 0 && 'text-red-500',
                            data.deltaPercent === 0 && 'text-gray-400'
                        )}
                    >
                        {data.deltaPercent > 0 ? '+' : ''}{data.deltaPercent.toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    );
};

interface MetricTrendProps {
    value: number;
    previousValue: number;
    className?: string;
}

export const MetricTrend: React.FC<MetricTrendProps> = ({
    value,
    previousValue,
    className,
}) => {
    const delta = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
    const isPositive = delta > 0;
    const isNeutral = delta === 0;

    return (
        <div className={cn('flex items-center gap-1', className)}>
            {isNeutral ? (
                <Minus className="w-3.5 h-3.5 text-gray-400" />
            ) : isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            )}
            <span
                className={cn(
                    'text-xs font-medium',
                    isNeutral && 'text-gray-400',
                    isPositive && 'text-emerald-500',
                    !isPositive && !isNeutral && 'text-red-500'
                )}
            >
                {isPositive ? '+' : ''}{delta.toFixed(1)}%
            </span>
        </div>
    );
};
