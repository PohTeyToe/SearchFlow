import { create } from 'zustand';
import type { DAG, DAGRun, Task } from '../types';

interface PipelineState {
    dags: DAG[];
    runs: DAGRun[];
    tasks: Task[];
    selectedDagId: string | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setDags: (dags: DAG[]) => void;
    setRuns: (runs: DAGRun[]) => void;
    setTasks: (tasks: Task[]) => void;
    selectDag: (dagId: string | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    refreshPipelines: () => Promise<void>;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
    dags: [],
    runs: [],
    tasks: [],
    selectedDagId: null,
    isLoading: false,
    error: null,

    setDags: (dags) => set({ dags }),

    setRuns: (runs) => set({ runs }),

    setTasks: (tasks) => set({ tasks }),

    selectDag: (dagId) => set({ selectedDagId: dagId }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    refreshPipelines: async () => {
        const { setLoading, setError } = get();
        setLoading(true);
        setError(null);

        try {
            // This will be connected to actual API later
            // For now, mock data will be loaded via React Query
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to refresh pipelines');
        } finally {
            setLoading(false);
        }
    },
}));
