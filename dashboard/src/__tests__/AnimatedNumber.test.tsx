import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';

// Mock useReducedMotion to return true so numbers render immediately
vi.mock('../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

describe('AnimatedNumber', () => {
  it('renders the formatted number value with reduced motion', () => {
    render(<AnimatedNumber value={1234} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('applies the className prop', () => {
    render(<AnimatedNumber value={42} className="metric-value" />);
    const el = screen.getByText('42');
    expect(el).toHaveClass('metric-value');
  });

  it('uses a custom format function', () => {
    render(
      <AnimatedNumber value={75} format={(n) => `${Math.round(n)}%`} />,
    );
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
