import { useCallback } from 'react';
import { useAssistantStore } from '../stores/assistantStore';
import { mockApi } from '../services';

export function useAssistant() {
    const { addMessage, setLoading, isLoading } = useAssistantStore();

    const sendMessage = useCallback(async (question: string) => {
        if (!question.trim() || isLoading) return;

        addMessage('user', question);
        setLoading(true);

        try {
            const response = await mockApi.askAssistant(question);
            addMessage('assistant', response.answer, response.toolsUsed);
        } catch {
            addMessage('assistant', 'Sorry, something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [addMessage, setLoading, isLoading]);

    return { sendMessage };
}
