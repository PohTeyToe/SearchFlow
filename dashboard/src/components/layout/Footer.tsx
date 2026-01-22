import React from 'react';
import { cn } from '../../utils';

export const Footer: React.FC<{ className?: string }> = ({ className }) => (
    <footer
        className={cn(
            'py-4 px-6 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]',
            className
        )}
    >
        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
            <p>© 2024 SearchFlow Analytics. Built with React + TypeScript.</p>
            <div className="flex items-center gap-4">
                <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">
                    Documentation
                </a>
                <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">
                    GitHub
                </a>
            </div>
        </div>
    </footer>
);
