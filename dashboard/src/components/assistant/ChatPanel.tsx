import React, { useEffect, useRef } from 'react';
import { cn } from '../../utils';
import { X, Sparkles } from 'lucide-react';
import { useAssistantStore } from '../../stores/assistantStore';
import { useAssistant } from '../../hooks/useAssistant';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export const ChatPanel: React.FC = () => {
    const { messages, isOpen, isLoading, setOpen } = useAssistantStore();
    const { sendMessage } = useAssistant();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Panel */}
            <div
                className={cn(
                    'fixed right-0 top-0 h-screen w-[400px] max-w-[calc(100vw-60px)] bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] z-50 flex flex-col shadow-2xl transition-transform duration-300',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Search Assistant
                            </h3>
                            <p className="text-[10px] text-[var(--color-text-muted)]">
                                Powered by LangChain
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-xs">Thinking...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <ChatInput onSend={sendMessage} disabled={isLoading} />
            </div>
        </>
    );
};
