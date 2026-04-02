import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value.trim() || disabled) return;
        onSend(value.trim());
        setValue('');
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-[var(--color-border)]">
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ask about your data..."
                disabled={disabled}
                className="flex-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] rounded-lg px-3 py-2 text-sm border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={disabled || !value.trim()}
                className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Send className="w-4 h-4" />
            </button>
        </form>
    );
};
