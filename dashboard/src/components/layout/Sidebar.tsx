import React from 'react';
import { cn } from '../../utils';
import { NavLink } from 'react-router-dom';
import { useThemeStore } from '../../stores';
import {
    LayoutDashboard,
    Workflow,
    BarChart3,
    Search,
    Settings,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pipelines', icon: Workflow, label: 'Pipelines' },
    { to: '/metrics', icon: BarChart3, label: 'Metrics' },
    { to: '/search', icon: Search, label: 'Search Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC = () => {
    const { sidebarCollapsed, toggleSidebar } = useThemeStore();

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 h-screen bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] transition-all duration-300 z-40',
                sidebarCollapsed ? 'w-16' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--color-border)]">
                {!sidebarCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">SF</span>
                        </div>
                        <span className="font-semibold text-[var(--color-text-primary)]">SearchFlow</span>
                    </div>
                )}
                <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <ChevronLeft className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="p-2 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-500/10 text-blue-500'
                                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                            )
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!sidebarCollapsed && (
                            <span className="text-sm font-medium">{item.label}</span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            {!sidebarCollapsed && (
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        SearchFlow Dashboard v1.0.0
                    </p>
                </div>
            )}
        </aside>
    );
};
