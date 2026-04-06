import React, { useEffect, useState, useRef } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, BarChart3, MapPin, Users, Loader2, CornerDownLeft } from 'lucide-react';
import { useAssistantStore } from '../../stores/assistantStore';
import { useAssistant } from '../../hooks/useAssistant';
import { BlurFade } from '../effects/BlurFade';
import { WidgetResponse } from './WidgetResponse';

const suggestions = [
    { label: 'Why is user_1008 at risk?', icon: AlertTriangle },
    { label: 'Show conversion funnel', icon: BarChart3 },
    { label: 'Which destinations are trending?', icon: MapPin },
    { label: 'Break down user segments', icon: Users },
] as const;

export const CommandPalette: React.FC = () => {
    const { isCommandOpen, setCommandOpen, messages, isLoading, clearMessages } =
        useAssistantStore();
    const { sendMessage } = useAssistant();
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    // The latest assistant response (if any)
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const hasResponse = !!lastAssistant;

    // Keyboard shortcut: Cmd+K / Ctrl+K
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setCommandOpen(!isCommandOpen);
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isCommandOpen, setCommandOpen]);

    // Focus input when dialog opens
    useEffect(() => {
        if (isCommandOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isCommandOpen]);

    function handleSubmit(question: string) {
        if (!question.trim() || isLoading) return;
        setInputValue('');
        sendMessage(question);
    }

    function handleNewQuestion() {
        clearMessages();
        setInputValue('');
        setTimeout(() => inputRef.current?.focus(), 50);
    }

    function handleClose() {
        setCommandOpen(false);
        // Reset state after close animation
        setTimeout(() => {
            clearMessages();
            setInputValue('');
        }, 200);
    }

    return (
        <AnimatePresence>
            {isCommandOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-50"
                        style={{ backgroundColor: 'rgba(20, 20, 20, 0.6)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={handleClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                        <div
                            className="w-full max-w-full sm:max-w-[640px] mx-2 sm:mx-4 overflow-hidden"
                            style={{
                                background: 'rgba(26, 26, 26, 0.8)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                borderRadius: 16,
                                boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {hasResponse && !isLoading ? (
                                <ResponseView
                                    question={lastUser?.content || ''}
                                    answer={lastAssistant!.content}
                                    toolsUsed={lastAssistant!.toolsUsed || []}
                                    onNewQuestion={handleNewQuestion}
                                    inputValue={inputValue}
                                    setInputValue={setInputValue}
                                    onSubmit={handleSubmit}
                                    inputRef={inputRef}
                                />
                            ) : (
                                <IdleView
                                    inputValue={inputValue}
                                    setInputValue={setInputValue}
                                    onSubmit={handleSubmit}
                                    isLoading={isLoading}
                                    inputRef={inputRef}
                                />
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

/* ---------- Idle / Suggestions View ---------- */

interface IdleViewProps {
    inputValue: string;
    setInputValue: (v: string) => void;
    onSubmit: (q: string) => void;
    isLoading: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

function IdleView({ inputValue, setInputValue, onSubmit, isLoading, inputRef }: IdleViewProps) {
    return (
        <Command
            className="flex flex-col"
            label="Ask the AI assistant"
            shouldFilter={false}
        >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                {isLoading ? (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                ) : (
                    <span className="text-[13px] text-white/30 shrink-0 font-medium">AI</span>
                )}
                <Command.Input
                    ref={inputRef as React.Ref<HTMLInputElement>}
                    value={inputValue}
                    onValueChange={setInputValue}
                    placeholder={isLoading ? 'Thinking...' : 'Ask anything about your analytics...'}
                    className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/25 caret-purple-400"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit(inputValue);
                        }
                    }}
                    disabled={isLoading}
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[11px] text-white/30 font-mono">
                    <CornerDownLeft className="w-3 h-3" />
                </kbd>
            </div>

            {/* Suggestions */}
            {!isLoading && (
                <Command.List className="p-2 max-h-[300px] overflow-y-auto">
                    <Command.Group
                        heading={
                            <span className="text-[11px] font-medium text-white/25 uppercase tracking-wider px-2">
                                Suggestions
                            </span>
                        }
                    >
                        {suggestions.map((s) => (
                            <Command.Item
                                key={s.label}
                                value={s.label}
                                onSelect={() => onSubmit(s.label)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 cursor-pointer transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-white hover:bg-white/[0.04]"
                            >
                                <s.icon className="w-4 h-4 text-white/30 shrink-0" />
                                {s.label}
                            </Command.Item>
                        ))}
                    </Command.Group>
                </Command.List>
            )}
        </Command>
    );
}

/* ---------- Response View ---------- */

interface ResponseViewProps {
    question: string;
    answer: string;
    toolsUsed: string[];
    onNewQuestion: () => void;
    inputValue: string;
    setInputValue: (v: string) => void;
    onSubmit: (q: string) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}

function ResponseView({
    question,
    answer,
    toolsUsed,
    onNewQuestion,
    inputValue,
    setInputValue,
    onSubmit,
    inputRef,
}: ResponseViewProps) {
    const toolLabels: Record<string, string> = {
        churn_prediction: 'Churn Model',
        shap_explainer: 'SHAP Explainer',
        sql_query: 'SQL Query',
        funnel_analysis: 'Funnel Analysis',
        recommendation_engine: 'Recommendations',
    };

    return (
        <div className="flex flex-col max-h-[60vh]">
            {/* Question */}
            <div className="px-4 pt-4 pb-2">
                <p className="text-xs text-white/30 mb-1">You asked</p>
                <p className="text-sm text-white/60">{question}</p>
            </div>

            {/* Response */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
                <BlurFade delay={0.05} duration={0.35}>
                    <WidgetResponse text={answer} />
                </BlurFade>
            </div>

            {/* Tool badges */}
            {toolsUsed.length > 0 && (
                <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-white/20 mr-1">Tools used</span>
                    {toolsUsed.map((tool) => (
                        <span
                            key={tool}
                            className="inline-flex px-2 py-0.5 rounded-full bg-purple-500/10 text-[10px] font-medium text-purple-300/70 border border-purple-500/15"
                        >
                            {toolLabels[tool] || tool}
                        </span>
                    ))}
                </div>
            )}

            {/* Follow-up input */}
            <div className="border-t border-white/[0.06] px-4 py-3 flex items-center gap-3">
                <button
                    onClick={onNewQuestion}
                    className="text-[11px] text-white/30 hover:text-white/50 transition-colors shrink-0"
                >
                    Clear
                </button>
                <input
                    ref={inputRef as React.Ref<HTMLInputElement>}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask another question..."
                    className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/25 caret-purple-400"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit(inputValue);
                        }
                    }}
                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[11px] text-white/30 font-mono">
                    <CornerDownLeft className="w-3 h-3" />
                </kbd>
            </div>
        </div>
    );
}
