import React from 'react';
import { cn, formatNumber, formatPercent } from '../../utils';
import type { SearchQuery } from '../../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ResultsTableProps {
    data: SearchQuery[];
    isLoading?: boolean;
    className?: string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
    data,
    isLoading = false,
    className,
}) => {
    const getTrendIcon = (rate: number) => {
        if (rate > 0.4) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
        if (rate < 0.2) return <TrendingDown className="h-4 w-4 text-red-500" />;
        return <Minus className="h-4 w-4 text-gray-400" />;
    };

    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="w-full">
                <thead>
                    <tr className="border-b border-[var(--color-border)]">
                        <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Query
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Count
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Avg Position
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Click Rate
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Trend
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <td key={j} className="py-3 px-4">
                                        <div className="h-4 bg-[var(--color-border)] rounded animate-pulse" />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        data.map((query) => (
                            <tr
                                key={query.query}
                                className="hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            >
                                <td className="py-3 px-4">
                                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                        {query.query}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className="text-sm text-[var(--color-text-secondary)]">
                                        {formatNumber(query.count)}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className="text-sm text-[var(--color-text-secondary)]">
                                        {query.avgPosition.toFixed(1)}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className={cn(
                                        'text-sm font-medium',
                                        query.clickRate > 0.4 ? 'text-emerald-500' :
                                            query.clickRate < 0.2 ? 'text-red-500' :
                                                'text-[var(--color-text-secondary)]'
                                    )}>
                                        {formatPercent(query.clickRate * 100)}
                                    </span>
                                </td>
                                <td className="py-3 px-4 flex justify-center">
                                    {getTrendIcon(query.clickRate)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
