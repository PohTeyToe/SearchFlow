import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 200,
    className,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrows = {
        top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-[var(--color-bg-tertiary)] border-x-transparent border-b-transparent',
        bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-[var(--color-bg-tertiary)] border-x-transparent border-t-transparent',
        left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-[var(--color-bg-tertiary)] border-y-transparent border-r-transparent',
        right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-[var(--color-bg-tertiary)] border-y-transparent border-l-transparent',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {isVisible && (
                <div
                    ref={tooltipRef}
                    className={cn(
                        'absolute z-50 px-2 py-1 text-xs font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] rounded shadow-lg whitespace-nowrap',
                        positions[position],
                        className
                    )}
                    role="tooltip"
                >
                    {content}
                    <span className={cn('absolute border-4', arrows[position])} />
                </div>
            )}
        </div>
    );
};
