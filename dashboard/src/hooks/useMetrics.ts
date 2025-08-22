import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../services';
import { useMetricsStore } from '../stores';

export function useDataQualityMetrics() {
    const { setQualityMetrics } = useMetricsStore();

    return useQuery({
        queryKey: ['quality-metrics'],
        queryFn: async () => {
            const metrics = await mockApi.getQualityMetrics();
            setQualityMetrics(metrics);
            return metrics;
        },
        staleTime: 30000,
    });
}

export function useRecordCounts() {
    const { setRecordCounts } = useMetricsStore();

    return useQuery({
        queryKey: ['record-counts'],
        queryFn: async () => {
            const counts = await mockApi.getRecordCounts();
            setRecordCounts(counts);
            return counts;
        },
        refetchInterval: 15000,
        staleTime: 10000,
    });
}

export function usePipelineMetrics() {
    const { setPipelineMetrics } = useMetricsStore();

    return useQuery({
        queryKey: ['pipeline-metrics'],
        queryFn: async () => {
            const metrics = await mockApi.getPipelineMetrics();
            setPipelineMetrics(metrics);
            return metrics;
        },
        refetchInterval: 10000,
        staleTime: 5000,
    });
}
