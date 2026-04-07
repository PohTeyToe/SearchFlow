import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DriftStatusIndicator } from '../DriftStatusIndicator';
import { PerformanceChart } from '../PerformanceChart';
import { DriftMonitor } from '../DriftMonitor';

// Mock the monitoring API
vi.mock('../../../services/monitoringApi', () => ({
  fetchDriftStatus: vi.fn().mockResolvedValue({
    drift_detected: false,
    drift_score: 0.12,
    per_feature: { lead_time: { drifted: false, score: 0.08 } },
    last_checked: new Date().toISOString(),
  }),
  fetchPerformanceHistory: vi.fn().mockResolvedValue([
    { run_id: 'r1', timestamp: new Date().toISOString(), auc: 0.87, accuracy: 0.82, f1: 0.77 },
  ]),
}));

describe('DriftStatusIndicator', () => {
  it('renders drift status indicator', () => {
    render(<DriftStatusIndicator status={{
      drift_detected: false, drift_score: 0.12,
      per_feature: {}, last_checked: new Date().toISOString(),
    }} />);
    expect(screen.getByTestId('drift-status')).toBeInTheDocument();
  });

  it('shows green status when no drift detected', () => {
    render(<DriftStatusIndicator status={{
      drift_detected: false, drift_score: 0.1,
      per_feature: {}, last_checked: new Date().toISOString(),
    }} />);
    expect(screen.getByText('No Drift')).toBeInTheDocument();
  });

  it('shows red status when drift detected', () => {
    render(<DriftStatusIndicator status={{
      drift_detected: true, drift_score: 0.5,
      per_feature: {}, last_checked: new Date().toISOString(),
    }} />);
    expect(screen.getByText('Drift Detected')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<DriftStatusIndicator status={null} loading={true} />);
    expect(screen.getByTestId('drift-loading')).toBeInTheDocument();
  });

  it('handles error state', () => {
    render(<DriftStatusIndicator status={null} error="Connection failed" />);
    expect(screen.getByTestId('drift-error')).toBeInTheDocument();
  });
});

describe('PerformanceChart', () => {
  it('renders performance chart with data', () => {
    render(<PerformanceChart data={[
      { run_id: 'r1', timestamp: new Date().toISOString(), auc: 0.87, accuracy: 0.82, f1: 0.77 },
    ]} />);
    expect(screen.getByTestId('perf-chart')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<PerformanceChart data={[]} loading={true} />);
    expect(screen.getByTestId('perf-loading')).toBeInTheDocument();
  });
});

describe('DriftMonitor', () => {
  it('renders without crashing', async () => {
    render(<DriftMonitor />);
    expect(screen.getByTestId('drift-monitor')).toBeInTheDocument();
  });
});
