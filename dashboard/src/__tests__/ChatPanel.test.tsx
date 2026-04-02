import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChatButton } from '../components/assistant/ChatButton';
import { ChatPanel } from '../components/assistant/ChatPanel';
import { useAssistantStore } from '../stores/assistantStore';

function renderWithRouter(ui: React.ReactElement) {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('ChatButton', () => {
    beforeEach(() => {
        useAssistantStore.setState({ isOpen: false });
    });

    it('renders the floating button', () => {
        renderWithRouter(<ChatButton />);
        expect(screen.getByLabelText('Open AI Assistant')).toBeInTheDocument();
    });

    it('opens the panel when clicked', () => {
        renderWithRouter(<ChatButton />);
        fireEvent.click(screen.getByLabelText('Open AI Assistant'));
        expect(useAssistantStore.getState().isOpen).toBe(true);
    });

    it('hides button when panel is open', () => {
        useAssistantStore.setState({ isOpen: true });
        renderWithRouter(<ChatButton />);
        expect(screen.queryByLabelText('Open AI Assistant')).not.toBeInTheDocument();
    });
});

describe('ChatPanel', () => {
    beforeEach(() => {
        useAssistantStore.setState({
            isOpen: true,
            messages: [
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: 'Ask me anything about your search analytics.',
                    timestamp: new Date().toISOString(),
                },
            ],
            isLoading: false,
        });
    });

    it('renders the panel header', () => {
        renderWithRouter(<ChatPanel />);
        expect(screen.getByText('Search Assistant')).toBeInTheDocument();
    });

    it('shows the welcome message', () => {
        renderWithRouter(<ChatPanel />);
        expect(screen.getByText(/Ask me anything/)).toBeInTheDocument();
    });

    it('shows the input field', () => {
        renderWithRouter(<ChatPanel />);
        expect(screen.getByPlaceholderText('Ask about your data...')).toBeInTheDocument();
    });

    it('renders the powered by label', () => {
        renderWithRouter(<ChatPanel />);
        expect(screen.getByText('Powered by LangChain')).toBeInTheDocument();
    });

    it('shows typing indicator when loading', () => {
        useAssistantStore.setState({ isLoading: true });
        renderWithRouter(<ChatPanel />);
        expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });
});
