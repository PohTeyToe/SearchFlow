import React from 'react';
import { cn, formatNumber, formatPercent } from '../../utils';
import { Card } from '../ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: {
        value: number;
        isPositive?: boolean;
        label?: string;
    };
    icon?: React.ReactNode;
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    trend,
    icon,
    className,
}) => {
    const getTrendIcon = () => {
        if (!trend) return null;
        if (trend.value > 0) return <TrendingUp className="w-4 h-4" />;
        if (trend.value < 0) return <TrendingDown className="w-4 h-4" />;
        return <Minus className="w-4 h-4" />;
    };

    const getTrendColor = () => {
        if (!trend) return '';
        const positive = trend.isPositive ?? trend.value > 0;
        if (trend.value === 0) return 'text-gray-500';
        return positive ? 'text-emerald-500' : 'text-red-500';
    };

    return (
        <Card className={cn(className)}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-1">
                        {typeof value === 'number' ? formatNumber(value) : value}
                    </p>
                    {subtitle && (
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>
                    )}
                    {trend && (
                        <div className={cn('flex items-center gap-1 mt-2 text-sm', getTrendColor())}>
                            {getTrendIcon()}
                            <span>{trend.value > 0 ? '+' : ''}{formatPercent(trend.value)}</span>
                            {trend.label && (
                                <span className="text-[var(--color-text-muted)]">{trend.label}</span>
                            )}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center text-[var(--color-text-secondary)]">
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    );
};
