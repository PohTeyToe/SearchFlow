export interface DriftStatus {
  drift_detected: boolean;
  drift_score: number;
  per_feature: Record<string, { drifted: boolean; score: number }>;
  last_checked: string;
}

export interface PerformanceRecord {
  run_id: string;
  timestamp: string;
  auc: number;
  accuracy: number;
  f1: number;
}

const ML_ENGINE_URL = import.meta.env.VITE_ML_ENGINE_URL || 'http://localhost:8000';

const MOCK_DRIFT_STATUS: DriftStatus = {
  drift_detected: false,
  drift_score: 0.12,
  per_feature: {
    lead_time: { drifted: false, score: 0.08 },
    adr: { drifted: false, score: 0.11 },
    total_stay_nights: { drifted: false, score: 0.05 },
    previous_cancellations: { drifted: false, score: 0.15 },
    booking_changes: { drifted: false, score: 0.03 },
  },
  last_checked: new Date(Date.now() - 300000).toISOString(),
};

const MOCK_PERFORMANCE: PerformanceRecord[] = [
  { run_id: 'run_001', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), auc: 0.871, accuracy: 0.823, f1: 0.766 },
  { run_id: 'run_002', timestamp: new Date(Date.now() - 6 * 86400000).toISOString(), auc: 0.868, accuracy: 0.821, f1: 0.762 },
  { run_id: 'run_003', timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), auc: 0.873, accuracy: 0.826, f1: 0.771 },
  { run_id: 'run_004', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), auc: 0.869, accuracy: 0.822, f1: 0.765 },
  { run_id: 'run_005', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), auc: 0.875, accuracy: 0.828, f1: 0.773 },
  { run_id: 'run_006', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), auc: 0.872, accuracy: 0.825, f1: 0.769 },
  { run_id: 'run_007', timestamp: new Date(Date.now() - 86400000).toISOString(), auc: 0.874, accuracy: 0.827, f1: 0.772 },
];

export async function fetchDriftStatus(): Promise<DriftStatus> {
  try {
    const res = await fetch(`${ML_ENGINE_URL}/monitor/drift`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return MOCK_DRIFT_STATUS;
  }
}

export async function fetchPerformanceHistory(): Promise<PerformanceRecord[]> {
  try {
    const res = await fetch(`${ML_ENGINE_URL}/monitor/performance`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.length > 0 ? data : MOCK_PERFORMANCE;
  } catch {
    return MOCK_PERFORMANCE;
  }
}
