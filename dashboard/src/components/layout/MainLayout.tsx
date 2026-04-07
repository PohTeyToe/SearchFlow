import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useThemeStore } from '../../stores';
import { CommandPalette } from '../assistant/CommandPalette';

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
    breadcrumbs?: { label: string; href?: string }[];
    fullWidth?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    title,
    subtitle,
    headerActions,
    breadcrumbs,
    fullWidth,
}) => {
    const { sidebarCollapsed } = useThemeStore();

    useEffect(() => {
        document.title = title
            ? `SearchFlow — ${title}`
            : 'SearchFlow — Travel Search Analytics Platform';
    }, [title]);

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
            {/* Dot grid background */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />

            <Sidebar />
            <motion.div
                className="relative z-10"
                animate={{ marginLeft: sidebarCollapsed ? 56 : 240 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            >
                <Header
                    title={title}
                    subtitle={subtitle}
                    actions={headerActions}
                    breadcrumbs={breadcrumbs}
                />
                <motion.main
                    className={fullWidth ? '' : 'p-6'}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                >
                    {children}
                </motion.main>
            </motion.div>
            <CommandPalette />
        </div>
    );
};
