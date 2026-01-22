import React from 'react';
import { cn, formatRelativeTime, formatDuration } from '../../utils';
import type { DAGRun } from '../../types';
import { StatusIndicator } from './StatusIndicator';

interface PipelineTimelineProps {
    runs: DAGRun[];
    maxItems?: number;
    className?: string;
}

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({
    runs,
    maxItems = 10,
    className,
}) => {
    const displayRuns = runs.slice(0, maxItems);

    return (
        <div className={cn('relative', className)}>
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--color-border)]" />

            <div className="space-y-4">
                {displayRuns.map((run) => (
                    <div key={run.runId} className="relative flex gap-4 pl-10">
                        {/* Timeline dot */}
                        <div
                            className={cn(
                                'absolute left-2.5 w-3 h-3 rounded-full border-2 border-[var(--color-bg-secondary)]',
                                run.state === 'running' && 'bg-blue-500',
                                run.state === 'success' && 'bg-emerald-500',
                                run.state === 'failed' && 'bg-red-500',
                                run.state === 'queued' && 'bg-amber-500'
                            )}
                        />

                        <div className="flex-1 bg-[var(--color-bg-tertiary)] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                    {run.dagId}
                                </span>
                                <StatusIndicator status={run.state} size="sm" />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                                <span>{formatRelativeTime(run.startDate)}</span>
                                {run.duration && (
                                    <>
                                        <span>•</span>
                                        <span>{formatDuration(run.duration)}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {runs.length > maxItems && (
                <p className="text-sm text-[var(--color-text-muted)] text-center mt-4 pl-10">
                    +{runs.length - maxItems} more runs
                </p>
            )}
        </div>
    );
};
