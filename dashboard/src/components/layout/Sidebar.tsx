import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '../../stores';
import {
    LayoutDashboard,
    Workflow,
    BarChart3,
    Search,
    Settings,
    Users,
    ChevronLeft,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { useAssistantStore } from '../../stores/assistantStore';
import { useMediaQuery } from '../../hooks/useCustomHooks';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/search', icon: Search, label: 'Search Analytics' },
    { to: '/users', icon: Users, label: 'Users', id: 'nav-users' },
    { to: '/pipelines', icon: Workflow, label: 'Pipelines' },
    { to: '/metrics', icon: BarChart3, label: 'Metrics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar: React.FC = () => {
    const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useThemeStore();
    const { toggleCommand } = useAssistantStore();
    const isNarrow = useMediaQuery('(max-width: 1024px)');
    const reduced = useReducedMotion();

    // Auto-collapse on narrow viewports
    useEffect(() => {
        if (isNarrow && !sidebarCollapsed) {
            setSidebarCollapsed(true);
        }
    }, [isNarrow, sidebarCollapsed, setSidebarCollapsed]);

    return (
        <motion.aside
            className="fixed left-0 top-0 h-screen border-r border-[var(--border-subtle)] z-40 flex flex-col"
            style={{ backgroundColor: 'var(--bg-sidebar)' }}
            animate={{ width: sidebarCollapsed ? 56 : 240 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        >
            {/* Logo */}
            <div className="h-14 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
                <AnimatePresence>
                    {!sidebarCollapsed && (
                        <motion.div
                            className="flex items-center gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-lg shadow-[var(--accent-glow)]">
                                <span className="text-white font-bold text-xs">SF</span>
                            </div>
                            <span className="font-semibold text-sm text-[var(--text-primary)]">SearchFlow</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                {sidebarCollapsed && (
                    <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center mx-auto shadow-lg shadow-[var(--accent-glow)]">
                        <span className="text-white font-bold text-xs">SF</span>
                    </div>
                )}
                {!sidebarCollapsed && (
                    <button
                        onClick={toggleSidebar}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                        aria-label="Collapse sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                {sidebarCollapsed && (
                    <button
                        onClick={toggleSidebar}
                        className="w-full flex justify-center p-2 mb-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                        aria-label="Expand sidebar"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        id={item.id}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                                isActive
                                    ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                            } ${sidebarCollapsed ? 'justify-center px-2' : ''}`
                        }
                    >
                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                        <AnimatePresence>
                            {!sidebarCollapsed && (
                                <motion.span
                                    className="text-sm font-medium"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {item.label}
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom actions */}
            <div className="p-2 border-t border-[var(--border-subtle)] space-y-0.5">
                <motion.button
                    onClick={toggleCommand}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] transition-all duration-150 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                    whileHover={reduced ? undefined : { scale: 1.02 }}
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                    <Sparkles className="w-[18px] h-[18px] flex-shrink-0" />
                    <AnimatePresence>
                        {!sidebarCollapsed && (
                            <motion.div
                                className="flex items-center justify-between flex-1"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <span className="text-sm font-medium">AI Assistant</span>
                                <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--border-default)] text-[var(--text-muted)]">
                                    ⌘K
                                </kbd>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.button>
            </div>
        </motion.aside>
    );
};
