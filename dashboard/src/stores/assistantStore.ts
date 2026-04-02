import { create } from 'zustand';
import type { ChatMessage } from '../types';
import { generateId } from '../utils';

interface AssistantState {
    messages: ChatMessage[];
    isOpen: boolean;
    isLoading: boolean;

    togglePanel: () => void;
    setOpen: (open: boolean) => void;
    addMessage: (role: 'user' | 'assistant', content: string, toolsUsed?: string[]) => void;
    setLoading: (loading: boolean) => void;
    clearMessages: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
    messages: [
        {
            id: 'welcome',
            role: 'assistant',
            content: "Ask me anything about your search analytics. Try: \"Why is user_1008 at risk of churning?\"",
            timestamp: new Date().toISOString(),
        },
    ],
    isOpen: false,
    isLoading: false,

    togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (open) => set({ isOpen: open }),
    addMessage: (role, content, toolsUsed) =>
        set((state) => ({
            messages: [
                ...state.messages,
                {
                    id: generateId(),
                    role,
                    content,
                    timestamp: new Date().toISOString(),
                    toolsUsed,
                },
            ],
        })),
    setLoading: (loading) => set({ isLoading: loading }),
    clearMessages: () =>
        set({
            messages: [
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: "Ask me anything about your search analytics. Try: \"Why is user_1008 at risk of churning?\"",
                    timestamp: new Date().toISOString(),
                },
            ],
        }),
}));
