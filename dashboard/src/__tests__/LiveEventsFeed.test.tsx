import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LiveEventsFeed } from '../components/dashboard/LiveEventsFeed';

vi.mock('../services', () => ({
  mockApi: {
    getRealtimeEvents: vi.fn().mockResolvedValue([
      { type: 'search', message: 'user_1001 searched "flights to Paris"', timestamp: new Date().toISOString() },
      { type: 'click', message: 'user_1002 clicked result #3', timestamp: new Date().toISOString() },
    ]),
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderFeed() {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <LiveEventsFeed />
    </QueryClientProvider>,
  );
}

describe('LiveEventsFeed', () => {
  it('renders the "Live Events" header', () => {
    renderFeed();
    expect(screen.getByText('Live Events')).toBeInTheDocument();
  });

  it('renders event messages after data loads', async () => {
    renderFeed();
    expect(
      await screen.findByText('user_1001 searched "flights to Paris"'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('user_1002 clicked result #3'),
    ).toBeInTheDocument();
  });
});
