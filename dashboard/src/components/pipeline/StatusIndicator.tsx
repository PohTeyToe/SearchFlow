import React from 'react';
import { cn } from '../../utils';
import { CheckCircle, XCircle, Clock, Loader2, MinusCircle } from 'lucide-react';

type Status = 'running' | 'success' | 'failed' | 'pending' | 'queued' | 'skipped';

interface StatusIndicatorProps {
    status: Status;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const statusConfig: Record<Status, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
    running: {
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Running',
    },
    success: {
        icon: CheckCircle,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        label: 'Success',
    },
    failed: {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        label: 'Failed',
    },
    pending: {
        icon: Clock,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        label: 'Pending',
    },
    queued: {
        icon: Clock,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        label: 'Queued',
    },
    skipped: {
        icon: MinusCircle,
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        label: 'Skipped',
    },
};

const sizes = {
    sm: { icon: 'w-4 h-4', text: 'text-xs', padding: 'px-2 py-1' },
    md: { icon: 'w-5 h-5', text: 'text-sm', padding: 'px-2.5 py-1.5' },
    lg: { icon: 'w-6 h-6', text: 'text-base', padding: 'px-3 py-2' },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    status,
    size = 'md',
    showLabel = true,
    className,
}) => {
    const config = statusConfig[status];
    const sizeConfig = sizes[size];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full',
                config.bgColor,
                showLabel && sizeConfig.padding,
                className
            )}
        >
            <Icon
                className={cn(
                    sizeConfig.icon,
                    config.color,
                    status === 'running' && 'animate-spin'
                )}
            />
            {showLabel && (
                <span className={cn(sizeConfig.text, 'font-medium', config.color)}>
                    {config.label}
                </span>
            )}
        </div>
    );
};
