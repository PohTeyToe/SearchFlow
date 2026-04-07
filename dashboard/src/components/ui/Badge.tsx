import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md';
    className?: string;
    dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    className,
    dot = false,
}) => {
    const reduced = useReducedMotion();

    const variants = {
        default: 'bg-gray-500/10 text-gray-500',
        success: 'bg-emerald-500/10 text-emerald-500',
        warning: 'bg-amber-500/10 text-amber-500',
        error: 'bg-red-500/10 text-red-500',
        info: 'bg-blue-500/10 text-blue-500',
    };

    const sizes = {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
    };

    const dotColors = {
        default: 'bg-gray-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <motion.span
            className={cn(
                'inline-flex items-center gap-1.5 font-medium rounded-full',
                variants[variant],
                sizes[size],
                className
            )}
            initial={reduced ? undefined : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
            {dot && (
                <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
            )}
            {children}
        </motion.span>
    );
};
