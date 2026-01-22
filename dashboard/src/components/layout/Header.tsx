import React from 'react';
import { useThemeStore } from '../../stores';
import { Moon, Sun, Bell, User } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
    const { resolvedTheme, toggleTheme } = useThemeStore();

    return (
        <header className="h-16 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] flex items-center justify-between px-6">
            <div>
                {title && (
                    <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h1>
                )}
                {subtitle && (
                    <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
                )}
            </div>

            <div className="flex items-center gap-2">
                {actions}

                {/* Theme toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {resolvedTheme === 'dark' ? (
                        <Sun className="w-5 h-5" />
                    ) : (
                        <Moon className="w-5 h-5" />
                    )}
                </Button>

                {/* Notifications */}
                <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                </Button>

                {/* User menu */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ml-2 cursor-pointer">
                    <User className="w-4 h-4 text-white" />
                </div>
            </div>
        </header>
    );
};
