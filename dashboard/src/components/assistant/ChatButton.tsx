import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useAssistantStore } from '../../stores/assistantStore';

export const ChatButton: React.FC = () => {
    const { togglePanel, isOpen } = useAssistantStore();

    if (isOpen) return null;

    return (
        <button
            id="chat-button"
            onClick={togglePanel}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40"
            aria-label="Open AI Assistant"
        >
            <MessageSquare className="w-6 h-6" />
        </button>
    );
};
