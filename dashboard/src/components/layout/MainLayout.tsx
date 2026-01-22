import React from 'react';
import { cn } from '../../utils';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useThemeStore } from '../../stores';

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    children,
    title,
    subtitle,
    headerActions,
}) => {
    const { sidebarCollapsed } = useThemeStore();

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)]">
            <Sidebar />
            <div
                className={cn(
                    'transition-all duration-300',
                    sidebarCollapsed ? 'ml-16' : 'ml-64'
                )}
            >
                <Header title={title} subtitle={subtitle} actions={headerActions} />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
};
