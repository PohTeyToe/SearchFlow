import { create } from 'zustand';
import type { DataQualityMetric, RecordCount, PipelineMetrics, TimeRange } from '../types';

interface MetricsState {
    qualityMetrics: DataQualityMetric[];
    recordCounts: RecordCount[];
    pipelineMetrics: PipelineMetrics | null;
    timeRange: TimeRange;
    isLoading: boolean;
    error: string | null;

    // Actions
    setQualityMetrics: (metrics: DataQualityMetric[]) => void;
    setRecordCounts: (counts: RecordCount[]) => void;
    setPipelineMetrics: (metrics: PipelineMetrics) => void;
    setTimeRange: (range: TimeRange) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;

    // Computed
    getPassRate: () => number;
    getTotalRecords: () => number;
}

const defaultTimeRange: TimeRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    label: 'Last 7 days',
};

export const useMetricsStore = create<MetricsState>((set, get) => ({
    qualityMetrics: [],
    recordCounts: [],
    pipelineMetrics: null,
    timeRange: defaultTimeRange,
    isLoading: false,
    error: null,

    setQualityMetrics: (metrics) => set({ qualityMetrics: metrics }),

    setRecordCounts: (counts) => set({ recordCounts: counts }),

    setPipelineMetrics: (metrics) => set({ pipelineMetrics: metrics }),

    setTimeRange: (range) => set({ timeRange: range }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    getPassRate: () => {
        const { qualityMetrics } = get();
        if (qualityMetrics.length === 0) return 0;
        const passed = qualityMetrics.filter(m => m.status === 'pass').length;
        return (passed / qualityMetrics.length) * 100;
    },

    getTotalRecords: () => {
        const { recordCounts } = get();
        return recordCounts.reduce((sum, r) => sum + r.count, 0);
    },
}));
