import React from 'react';
import { cn } from '../../utils';

interface AvatarProps {
    src?: string;
    alt?: string;
    name?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const getInitials = (name: string): string => {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const getColorFromName = (name: string): string => {
    const colors = [
        'bg-blue-500',
        'bg-emerald-500',
        'bg-amber-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-cyan-500',
        'bg-orange-500',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
};

export const Avatar: React.FC<AvatarProps> = ({
    src,
    alt = '',
    name = '',
    size = 'md',
    className,
}) => {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    };

    if (src) {
        return (
            <img
                src={src}
                alt={alt || name}
                className={cn(
                    'rounded-full object-cover',
                    sizes[size],
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center font-medium text-white',
                sizes[size],
                name ? getColorFromName(name) : 'bg-gray-400',
                className
            )}
        >
            {name ? getInitials(name) : '?'}
        </div>
    );
};

interface AvatarGroupProps {
    children: React.ReactNode;
    max?: number;
    className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ children, max = 4, className }) => {
    const childArray = React.Children.toArray(children);
    const visible = childArray.slice(0, max);
    const remaining = childArray.length - max;

    return (
        <div className={cn('flex -space-x-2', className)}>
            {visible.map((child, index) => (
                <div key={index} className="ring-2 ring-[var(--color-bg-primary)] rounded-full">
                    {child}
                </div>
            ))}
            {remaining > 0 && (
                <div className="w-10 h-10 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center text-sm font-medium text-[var(--color-text-secondary)] ring-2 ring-[var(--color-bg-primary)]">
                    +{remaining}
                </div>
            )}
        </div>
    );
};
