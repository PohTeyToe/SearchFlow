import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface TabsProps {
    defaultValue?: string;
    value?: string;
    onChange?: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

interface TabsContextValue {
    activeTab: string;
    setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export const Tabs: React.FC<TabsProps> = ({
    defaultValue,
    value,
    onChange,
    children,
    className,
}) => {
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const activeTab = value !== undefined ? value : internalValue;

    const setActiveTab = (newValue: string) => {
        if (value === undefined) {
            setInternalValue(newValue);
        }
        onChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={cn(className)}>{children}</div>
        </TabsContext.Provider>
    );
};

interface TabListProps {
    children: React.ReactNode;
    className?: string;
}

export const TabList: React.FC<TabListProps> = ({ children, className }) => (
    <div
        className={cn(
            'flex gap-1 p-1 bg-[var(--color-bg-tertiary)] rounded-lg relative',
            className
        )}
        role="tablist"
    >
        {children}
    </div>
);

interface TabProps {
    value: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const Tab: React.FC<TabProps> = ({ value, children, className, disabled }) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('Tab must be used within Tabs');
    const reduced = useReducedMotion();

    const isActive = context.activeTab === value;

    return (
        <button
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => context.setActiveTab(value)}
            className={cn(
                'relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 z-[1]',
                isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
        >
            {isActive && (
                <motion.div
                    className="absolute inset-0 bg-[var(--color-bg-secondary)] rounded-md shadow-sm"
                    layoutId="tab-indicator"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
                    style={{ zIndex: -1 }}
                />
            )}
            {children}
        </button>
    );
};

interface TabPanelProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ value, children, className }) => {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error('TabPanel must be used within Tabs');

    if (context.activeTab !== value) return null;

    return (
        <div role="tabpanel" className={cn('mt-4', className)}>
            {children}
        </div>
    );
};
