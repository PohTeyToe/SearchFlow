import { useEffect, useState, useCallback } from 'react';
import { DriftStatusIndicator } from './DriftStatusIndicator';
import { PerformanceChart } from './PerformanceChart';
import { fetchDriftStatus, fetchPerformanceHistory, type DriftStatus, type PerformanceRecord } from '../../services/monitoringApi';

export function DriftMonitor() {
  const [driftStatus, setDriftStatus] = useState<DriftStatus | null>(null);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [drift, perf] = await Promise.all([
        fetchDriftStatus(),
        fetchPerformanceHistory(),
      ]);
      setDriftStatus(drift);
      setPerformance(perf);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div data-testid="drift-monitor" style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <DriftStatusIndicator status={driftStatus} loading={loading} error={error} />
      <PerformanceChart data={performance} loading={loading} />
      {driftStatus?.per_feature && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: '1px solid #334155',
              color: '#94a3b8',
              padding: '4px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {expanded ? 'Hide' : 'Show'} Feature Details
          </button>
          {expanded && (
            <table data-testid="feature-table" style={{ width: '100%', marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '4px 8px' }}>Feature</th>
                  <th style={{ padding: '4px 8px' }}>Score</th>
                  <th style={{ padding: '4px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(driftStatus.per_feature).map(([name, info]) => (
                  <tr key={name}>
                    <td style={{ padding: '4px 8px' }}>{name}</td>
                    <td style={{ padding: '4px 8px' }}>{(info.score * 100).toFixed(1)}%</td>
                    <td style={{ padding: '4px 8px', color: info.drifted ? '#ef4444' : '#22c55e' }}>
                      {info.drifted ? 'Drifted' : 'Stable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
