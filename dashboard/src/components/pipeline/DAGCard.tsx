import React from 'react';
import { cn, formatRelativeTime, formatDuration } from '../../utils';
import type { DAG } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Play, Pause, Clock } from 'lucide-react';

interface DAGCardProps {
    dag: DAG;
    onClick?: () => void;
    className?: string;
}

const getStatusBadgeVariant = (state: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (state) {
        case 'success':
            return 'success';
        case 'failed':
            return 'error';
        case 'running':
            return 'info';
        default:
            return 'warning';
    }
};

export const DAGCard: React.FC<DAGCardProps> = ({ dag, onClick, className }) => {
    return (
        <Card
            className={cn('cursor-pointer hover:border-[var(--color-border-hover)]', className)}
            hover
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {dag.isPaused ? (
                        <Pause className="w-5 h-5 text-amber-500" />
                    ) : (
                        <Play className="w-5 h-5 text-emerald-500" />
                    )}
                    <h3 className="font-medium text-[var(--color-text-primary)]">{dag.dagId}</h3>
                </div>
                {dag.lastRun && (
                    <Badge variant={getStatusBadgeVariant(dag.lastRun.state)} dot>
                        {dag.lastRun.state}
                    </Badge>
                )}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                {dag.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{dag.schedule}</span>
                </div>
                {dag.lastRun && (
                    <>
                        <span>•</span>
                        <span>{formatRelativeTime(dag.lastRun.startDate)}</span>
                        {dag.lastRun.duration && (
                            <>
                                <span>•</span>
                                <span>{formatDuration(dag.lastRun.duration)}</span>
                            </>
                        )}
                    </>
                )}
            </div>

            {dag.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {dag.tags.map((tag) => (
                        <span
                            key={tag}
                            className="px-1.5 py-0.5 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </Card>
    );
};
