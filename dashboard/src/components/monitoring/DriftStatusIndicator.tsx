import { type DriftStatus } from '../../services/monitoringApi';

interface Props {
  status: DriftStatus | null;
  loading?: boolean;
  error?: string | null;
}

function getStatusColor(status: DriftStatus): string {
  if (status.drift_detected) return '#ef4444';
  if (status.drift_score > 0.2) return '#eab308';
  return '#22c55e';
}

function getStatusLabel(status: DriftStatus): string {
  if (status.drift_detected) return 'Drift Detected';
  if (status.drift_score > 0.2) return 'Minor Drift';
  return 'No Drift';
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DriftStatusIndicator({ status, loading, error }: Props) {
  if (loading) {
    return <div data-testid="drift-loading" style={{ padding: 16, color: '#94a3b8' }}>Loading drift status...</div>;
  }

  if (error) {
    return <div data-testid="drift-error" style={{ padding: 16, color: '#ef4444' }}>Error: {error}</div>;
  }

  if (!status) return null;

  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <div data-testid="drift-status" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16 }}>
      <div
        data-testid="drift-badge"
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <div>
        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Score: {(status.drift_score * 100).toFixed(1)}% | Checked {formatRelativeTime(status.last_checked)}
        </div>
      </div>
    </div>
  );
}
