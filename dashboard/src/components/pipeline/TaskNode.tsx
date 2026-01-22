import React from 'react';
import { cn, getStatusColor } from '../../utils';
import type { Task } from '../../types';
import { CheckCircle, XCircle, Clock, MinusCircle, RefreshCw } from 'lucide-react';

interface TaskNodeProps {
    task: Task;
    onClick?: () => void;
    className?: string;
}

const getTaskIcon = (state: Task['state']) => {
    switch (state) {
        case 'running':
            return <RefreshCw className="w-4 h-4 animate-spin" />;
        case 'success':
            return <CheckCircle className="w-4 h-4" />;
        case 'failed':
            return <XCircle className="w-4 h-4" />;
        case 'skipped':
            return <MinusCircle className="w-4 h-4" />;
        default:
            return <Clock className="w-4 h-4" />;
    }
};

export const TaskNode: React.FC<TaskNodeProps> = ({ task, onClick, className }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                'hover:bg-[var(--color-bg-tertiary)]',
                task.state === 'running' && 'border-blue-500 bg-blue-500/5',
                task.state === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
                task.state === 'failed' && 'border-red-500/30 bg-red-500/5',
                task.state === 'pending' && 'border-[var(--color-border)]',
                task.state === 'skipped' && 'border-[var(--color-border)] opacity-50',
                className
            )}
        >
            <span className={cn(getStatusColor(task.state))}>
                {getTaskIcon(task.state)}
            </span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {task.taskId}
            </span>
            {task.tryNumber > 1 && (
                <span className="text-xs text-[var(--color-text-muted)]">
                    (retry #{task.tryNumber})
                </span>
            )}
        </button>
    );
};
