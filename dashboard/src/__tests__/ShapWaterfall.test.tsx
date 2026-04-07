import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShapWaterfall } from '../components/users/ShapWaterfall';

const mockShapValues = [
    { feature: 'lead_time', featureLabel: 'Lead time (days)', value: 0.23, direction: 'increases' as const },
    { feature: 'adr', featureLabel: 'Avg daily rate ($)', value: -0.15, direction: 'decreases' as const },
    { feature: 'deposit_type_encoded', featureLabel: 'Deposit type', value: -0.08, direction: 'decreases' as const },
    { feature: 'previous_cancellations', featureLabel: 'Previous cancellations', value: 0.12, direction: 'increases' as const },
    { feature: 'weekend_stay_ratio', featureLabel: 'Weekend ratio', value: -0.05, direction: 'decreases' as const },
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
        expect(screen.getByText('Lead time (days)')).toBeInTheDocument();
        expect(screen.getByText('Avg daily rate ($)')).toBeInTheDocument();
    });
});
