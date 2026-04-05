import React from 'react';
import { useThemeStore } from '../../stores';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
    breadcrumbs?: { label: string; href?: string }[];
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions, breadcrumbs }) => {
    const { resolvedTheme, toggleTheme } = useThemeStore();

    return (
        <header className="h-14 sticky top-0 z-30 flex items-center justify-between px-6 border-b border-[var(--border-subtle)]" style={{ backgroundColor: 'rgba(17, 17, 17, 0.8)', backdropFilter: 'blur(12px)' }}>
            <div className="min-w-0">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-0.5">
                        {breadcrumbs.map((crumb, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span>/</span>}
                                {crumb.href ? (
                                    <a href={crumb.href} className="hover:text-[var(--text-secondary)] transition-colors">{crumb.label}</a>
                                ) : (
                                    <span className="text-[var(--text-secondary)]">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
                {title && (
                    <h1 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight truncate" style={{ letterSpacing: '-0.02em' }}>
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
                )}
            </div>

            <div className="flex items-center gap-2">
                {actions}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                    aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    <motion.div
                        animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
                        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                    >
                        {resolvedTheme === 'dark' ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                    </motion.div>
                </button>
            </div>
        </header>
    );
};
