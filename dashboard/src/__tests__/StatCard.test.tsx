import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../components/metrics/StatCard';

describe('StatCard', () => {
  it('renders title and string value', () => {
    render(<StatCard title="Users" value="1,234" />);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('formats numeric values', () => {
    render(<StatCard title="Revenue" value={50000} />);
    expect(screen.getByText('50,000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard title="Users" value={100} subtitle="Last 30 days" />);
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('renders positive trend', () => {
    render(
      <StatCard
        title="Sessions"
        value={200}
        trend={{ value: 12.5, isPositive: true, label: 'vs last week' }}
      />
    );
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('renders negative trend', () => {
    render(
      <StatCard
        title="Bounce Rate"
        value="45%"
        trend={{ value: -3.2 }}
      />
    );
    expect(screen.getByText('-3.2%')).toBeInTheDocument();
  });
});
