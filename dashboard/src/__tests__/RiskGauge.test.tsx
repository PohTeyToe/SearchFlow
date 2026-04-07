import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskGauge } from '../components/charts/RiskGauge';

// Mock useReducedMotion so AnimatedNumber renders immediately
vi.mock('../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

describe('RiskGauge', () => {
  it('renders "Low Risk" for probability < 0.3', () => {
    render(<RiskGauge probability={0.15} />);
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('renders "Medium Risk" for probability between 0.3 and 0.7', () => {
    render(<RiskGauge probability={0.5} />);
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
  });

  it('renders "High Risk" for probability > 0.7', () => {
    render(<RiskGauge probability={0.85} />);
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('shows the percentage value', () => {
    render(<RiskGauge probability={0.85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});
