import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { mockApi } from '../services';
import { decimateData } from '../utils/analyticsHelpers';

export function usePerformanceMetrics() {
    const [chartWidth, setChartWidth] = useState(800); // Default width, can be responsive

    const query = useQuery({
        queryKey: ['raw-large-dataset'],
        queryFn: async () => {
            // Fetch the 15,000 raw events
            return await mockApi.getRawLargeDataset();
        },
        staleTime: 60000,
        refetchOnWindowFocus: false,
    });

    // MEMOIZATION: This is the critical part of the story.
    // "calculated trend lines on every re-render" -> "useMemo"
    const optimizedData = useMemo(() => {
        if (!query.data) return [];

        // Without this decimation, rendering 15,000 SVG nodes freezes the browser
        return decimateData(query.data, chartWidth);

    }, [query.data, chartWidth]);

    const stats = useMemo(() => {
        if (!query.data) return null;
        return {
            totalEvents: query.data.length,
            errorRate: (query.data.filter(d => d.type === 'error').length / query.data.length) * 100,
            avgLatency: query.data.reduce((acc, curr) => acc + curr.value, 0) / query.data.length
        };
    }, [query.data]);

    return {
        ...query,
        optimizedData,
        recordCount: query.data?.length || 0,
        stats,
        setChartWidth
    };
}
