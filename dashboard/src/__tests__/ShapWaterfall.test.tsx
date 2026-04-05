import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShapWaterfall } from '../components/users/ShapWaterfall';

const mockShapValues = [
    { feature: 'days_since_last_activity', featureLabel: 'Days inactive', value: 0.23, direction: 'increases' as const },
    { feature: 'lifetime_value', featureLabel: 'Lifetime value ($)', value: -0.15, direction: 'decreases' as const },
    { feature: 'sessions_7d', featureLabel: 'Sessions (7d)', value: -0.08, direction: 'decreases' as const },
    { feature: 'abandonment_rate', featureLabel: 'Abandonment rate', value: 0.12, direction: 'increases' as const },
    { feature: 'search_to_click_ratio', featureLabel: 'Search-to-click ratio', value: -0.05, direction: 'decreases' as const },
];

describe('ShapWaterfall', () => {
    it('renders the chart title', () => {
        render(
            <ShapWaterfall
                shapValues={mockShapValues}
                baseValue={0.35}
                finalPrediction={0.42}
            />
        );
        expect(screen.getByText('Why is this user at risk?')).toBeInTheDocument();
    });

    it('shows base value and final prediction', () => {
        render(
            <ShapWaterfall
                shapValues={mockShapValues}
                baseValue={0.35}
                finalPrediction={0.42}
            />
        );
        expect(screen.getByText(/Base: 35%/)).toBeInTheDocument();
        expect(screen.getByText(/Final: 42%/)).toBeInTheDocument();
    });

    it('shows the legend', () => {
        render(
            <ShapWaterfall
                shapValues={mockShapValues}
                baseValue={0.35}
                finalPrediction={0.42}
            />
        );
        expect(screen.getByText('Decreases risk')).toBeInTheDocument();
        expect(screen.getByText('Increases risk')).toBeInTheDocument();
    });

    it('renders feature labels', () => {
        render(
            <ShapWaterfall
                shapValues={mockShapValues}
                baseValue={0.35}
                finalPrediction={0.42}
            />
        );
        expect(screen.getByText('Days inactive')).toBeInTheDocument();
        expect(screen.getByText('Lifetime value ($)')).toBeInTheDocument();
    });
});
