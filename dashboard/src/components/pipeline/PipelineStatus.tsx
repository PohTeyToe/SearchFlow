import React from 'react';
import { cn, formatPercent } from '../../utils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

interface PipelineStatusProps {
    totalDags: number;
    runningDags: number;
    successfulDags: number;
    failedDags: number;
    lastUpdated: string;
    isLoading?: boolean;
    className?: string;
}

export const PipelineStatus: React.FC<PipelineStatusProps> = ({
    totalDags,
    runningDags,
    successfulDags,
    failedDags,
    lastUpdated,
    isLoading = false,
    className,
}) => {
    const healthScore = totalDags > 0 ? (successfulDags / totalDags) * 100 : 0;

    const getHealthColor = () => {
        if (healthScore >= 90) return 'text-emerald-500';
        if (healthScore >= 70) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <Card className={cn('relative', className)}>
            {isLoading && (
                <div className="absolute inset-0 bg-[var(--color-bg-secondary)]/80 flex items-center justify-center rounded-xl z-10">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--color-text-primary)]">Pipeline Health</h3>
                <Badge variant={runningDags > 0 ? 'info' : 'default'} dot>
                    {runningDags > 0 ? 'Active' : 'Idle'}
                </Badge>
            </div>

            <div className="flex items-end justify-between mb-4">
                <div>
                    <span className={cn('text-4xl font-bold', getHealthColor())}>
                        {formatPercent(healthScore, 0)}
                    </span>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        Overall success rate
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold text-[var(--color-text-primary)]">{totalDags}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">Total DAGs</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-[var(--color-text-primary)]">{runningDags}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Running</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-[var(--color-text-primary)]">{successfulDags}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Success</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-[var(--color-text-primary)]">{failedDags}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Failed</p>
                    </div>
                </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
        </Card>
    );
};
