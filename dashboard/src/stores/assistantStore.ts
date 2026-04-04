import { create } from 'zustand';
import type { ChatMessage } from '../types';
import { generateId } from '../utils';

interface AssistantState {
    messages: ChatMessage[];
    isCommandOpen: boolean;
    isLoading: boolean;

    toggleCommand: () => void;
    setCommandOpen: (open: boolean) => void;
    addMessage: (role: 'user' | 'assistant', content: string, toolsUsed?: string[]) => void;
    setLoading: (loading: boolean) => void;
    clearMessages: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
    messages: [],
    isCommandOpen: false,
    isLoading: false,

    toggleCommand: () => set((state) => ({ isCommandOpen: !state.isCommandOpen })),
    setCommandOpen: (open) => set({ isCommandOpen: open }),
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
    clearMessages: () => set({ messages: [] }),
}));
