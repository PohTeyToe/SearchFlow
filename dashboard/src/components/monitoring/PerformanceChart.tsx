import { type PerformanceRecord } from '../../services/monitoringApi';

interface Props {
  data: PerformanceRecord[];
  loading?: boolean;
}

export function PerformanceChart({ data, loading }: Props) {
  if (loading) {
    return <div data-testid="perf-loading" style={{ padding: 16, color: '#94a3b8' }}>Loading performance data...</div>;
  }

  if (data.length === 0) {
    return <div data-testid="perf-empty" style={{ padding: 16, color: '#94a3b8' }}>No performance data available</div>;
  }

  const maxAuc = Math.max(...data.map(d => d.auc));
  const minAuc = Math.min(...data.map(d => d.auc));
  const range = Math.max(maxAuc - minAuc, 0.02);
  const threshold = 0.83;

  return (
    <div data-testid="perf-chart" style={{ padding: 16 }}>
      <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Model AUC-ROC Over Time</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, position: 'relative' }}>
        {/* Threshold line */}
        <div
          data-testid="threshold-line"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${((threshold - minAuc + 0.01) / (range + 0.02)) * 100}%`,
            borderTop: '1px dashed #ef4444',
            fontSize: 10,
            color: '#ef4444',
          }}
        >
          {threshold} threshold
        </div>
        {data.map((d) => {
          const height = ((d.auc - minAuc + 0.01) / (range + 0.02)) * 100;
          return (
            <div
              key={d.run_id}
              title={`AUC: ${d.auc.toFixed(4)} | ${new Date(d.timestamp).toLocaleDateString()}`}
              style={{
                flex: 1,
                height: `${height}%`,
                backgroundColor: d.auc >= threshold ? '#6366f1' : '#ef4444',
                borderRadius: '4px 4px 0 0',
                minWidth: 8,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 4 }}>
        <span>{data.length > 0 ? new Date(data[0].timestamp).toLocaleDateString() : ''}</span>
        <span>{data.length > 0 ? new Date(data[data.length - 1].timestamp).toLocaleDateString() : ''}</span>
      </div>
    </div>
  );
}
