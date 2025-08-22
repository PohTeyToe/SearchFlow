import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../services';
import { useSearchStore } from '../stores';

export function useSearchFunnel() {
    const { setFunnelData } = useSearchStore();

    return useQuery({
        queryKey: ['search-funnel'],
        queryFn: async () => {
            const data = await mockApi.getSearchFunnelData();
            setFunnelData(data);
            return data;
        },
        refetchInterval: 30000,
        staleTime: 20000,
    });
}

export function useTopQueries() {
    const { setTopQueries } = useSearchStore();

    return useQuery({
        queryKey: ['top-queries'],
        queryFn: async () => {
            const queries = await mockApi.getTopQueries();
            setTopQueries(queries);
            return queries;
        },
        staleTime: 60000,
    });
}

export function useUserSegments() {
    const { setUserSegments } = useSearchStore();

    return useQuery({
        queryKey: ['user-segments'],
        queryFn: async () => {
            const segments = await mockApi.getUserSegments();
            setUserSegments(segments);
            return segments;
        },
        staleTime: 60000,
    });
}

export function useSearch(query: string) {
    const { setIsSearching } = useSearchStore();

    return useQuery({
        queryKey: ['search', query],
        queryFn: async () => {
            setIsSearching(true);
            try {
                const results = await mockApi.search(query);
                return results;
            } finally {
                setIsSearching(false);
            }
        },
        enabled: query.length >= 0,
        staleTime: 10000,
    });
}
