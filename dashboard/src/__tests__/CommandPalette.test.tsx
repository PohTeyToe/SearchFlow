import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CommandPalette } from '../components/assistant/CommandPalette';
import { useAssistantStore } from '../stores/assistantStore';

// Mock the useAssistant hook so tests don't hit the mock API
vi.mock('../hooks/useAssistant', () => ({
  useAssistant: () => ({ sendMessage: vi.fn() }),
}));

// Mock BlurFade to render children directly
vi.mock('../components/effects/BlurFade', () => ({
  BlurFade: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock WidgetResponse
vi.mock('../components/assistant/WidgetResponse', () => ({
  WidgetResponse: ({ text }: { text: string }) => <div>{text}</div>,
}));

function renderPalette() {
  return render(
    <BrowserRouter>
      <CommandPalette />
    </BrowserRouter>,
  );
}

describe('CommandPalette', () => {
  beforeEach(() => {
    useAssistantStore.setState({
      isCommandOpen: false,
      messages: [],
      isLoading: false,
    });
  });

  it('is hidden when isCommandOpen is false', () => {
    renderPalette();
    expect(
      screen.queryByPlaceholderText('Ask anything about your analytics...'),
    ).not.toBeInTheDocument();
  });

  it('shows the input placeholder when open', () => {
    useAssistantStore.setState({ isCommandOpen: true });
    renderPalette();
    expect(
      screen.getByPlaceholderText('Ask anything about your analytics...'),
    ).toBeInTheDocument();
  });

  it('shows suggestion labels when open', () => {
    useAssistantStore.setState({ isCommandOpen: true });
    renderPalette();

    expect(screen.getByText('Why is user_1008 at risk?')).toBeInTheDocument();
    expect(screen.getByText('Show conversion funnel')).toBeInTheDocument();
    expect(screen.getByText('Which destinations are trending?')).toBeInTheDocument();
    expect(screen.getByText('Break down user segments')).toBeInTheDocument();
  });

  it('shows "Suggestions" group heading when open', () => {
    useAssistantStore.setState({ isCommandOpen: true });
    renderPalette();
    expect(screen.getByText('Suggestions')).toBeInTheDocument();
  });
});
