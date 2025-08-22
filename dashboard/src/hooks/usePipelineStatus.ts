import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../services';
import { usePipelineStore } from '../stores';

export function usePipelineStatus() {
    const { setDags } = usePipelineStore();

    return useQuery({
        queryKey: ['pipelines'],
        queryFn: async () => {
            const dags = await mockApi.getDags();
            setDags(dags);
            return dags;
        },
        refetchInterval: 5000, // Poll every 5 seconds for real-time updates
        staleTime: 3000,
    });
}

export function usePipelineRuns(dagId?: string) {
    const { setRuns } = usePipelineStore();

    return useQuery({
        queryKey: ['pipeline-runs', dagId],
        queryFn: async () => {
            const runs = await mockApi.getDagRuns(dagId);
            setRuns(runs);
            return runs;
        },
        refetchInterval: 10000,
        staleTime: 5000,
    });
}
