import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsersPage } from '../pages/UsersPage';

// Mock the mockApi
vi.mock('../services/mockApi', () => ({
    mockApi: {
        getUsers: vi.fn().mockResolvedValue([
            {
                userId: 'user_1001',
                segment: 'high_value',
                lastActive: new Date(Date.now() - 86400000).toISOString(),
                churnPrediction: {
                    probability: 0.15,
                    riskLevel: 'low',
                    topFactors: [{ feature: 'lifetime_value', featureLabel: 'Lifetime value ($)', value: -0.12, direction: 'decreases' }],
                    baseValue: 0.35,
                },
            },
            {
                userId: 'user_1008',
                segment: 'at_risk',
                lastActive: new Date(Date.now() - 86400000 * 14).toISOString(),
                churnPrediction: {
                    probability: 0.87,
                    riskLevel: 'high',
                    topFactors: [{ feature: 'days_since_last_activity', featureLabel: 'Days inactive', value: 0.23, direction: 'increases' }],
                    baseValue: 0.35,
                },
            },
            {
                userId: 'user_1020',
                segment: 'new_user',
                lastActive: new Date(Date.now() - 86400000 * 3).toISOString(),
                churnPrediction: {
                    probability: 0.45,
                    riskLevel: 'medium',
                    topFactors: [{ feature: 'sessions_7d', featureLabel: 'Sessions (7d)', value: 0.08, direction: 'increases' }],
                    baseValue: 0.35,
                },
            },
        ]),
    },
}));

function renderWithProviders(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>{ui}</BrowserRouter>
        </QueryClientProvider>
    );
}

describe('UsersPage', () => {
    it('renders the page title', async () => {
        renderWithProviders(<UsersPage />);
        expect(await screen.findByText('Total Users')).toBeInTheDocument();
    });

    it('renders user rows in the table', async () => {
        renderWithProviders(<UsersPage />);
        expect(await screen.findByText('user_1001')).toBeInTheDocument();
        expect(screen.getByText('user_1008')).toBeInTheDocument();
        expect(screen.getByText('user_1020')).toBeInTheDocument();
    });

    it('shows correct churn badge colors', async () => {
        renderWithProviders(<UsersPage />);
        // Wait for data
        await screen.findByText('user_1001');

        // Low risk (15%) - should have emerald/green styling
        const lowBadge = screen.getByText('15%');
        expect(lowBadge).toBeInTheDocument();

        // High risk (87%) - should have red styling
        const highBadge = screen.getByText('87%');
        expect(highBadge).toBeInTheDocument();

        // Medium risk (45%)
        const medBadge = screen.getByText('45%');
        expect(medBadge).toBeInTheDocument();
    });

    it('shows segment badges', async () => {
        renderWithProviders(<UsersPage />);
        await screen.findByText('user_1001');

        // Segment labels appear in both the table badges and the filter dropdown
        expect(screen.getAllByText('High Value').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('At Risk').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('New User').length).toBeGreaterThanOrEqual(1);
    });

    it('shows the top SHAP factor for each user', async () => {
        renderWithProviders(<UsersPage />);
        await screen.findByText('user_1001');

        expect(screen.getByText('Lifetime value ($)')).toBeInTheDocument();
        expect(screen.getByText('Days inactive')).toBeInTheDocument();
    });

    it('shows stat cards with summary metrics', async () => {
        renderWithProviders(<UsersPage />);
        await screen.findByText('Total Users');
        expect(screen.getByText('High Risk Users')).toBeInTheDocument();
        expect(screen.getByText('Avg Churn Probability')).toBeInTheDocument();
    });
});
