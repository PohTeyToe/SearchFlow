import { create } from 'zustand';
import type { SearchFunnelData, SearchQuery, UserSegment, FilterState } from '../types';

interface SearchState {
    funnelData: SearchFunnelData[];
    topQueries: SearchQuery[];
    userSegments: UserSegment[];
    filterState: FilterState;
    searchQuery: string;
    debouncedQuery: string;
    isSearching: boolean;

    // Actions
    setFunnelData: (data: SearchFunnelData[]) => void;
    setTopQueries: (queries: SearchQuery[]) => void;
    setUserSegments: (segments: UserSegment[]) => void;
    setSearchQuery: (query: string) => void;
    setDebouncedQuery: (query: string) => void;
    setFilters: (filters: Partial<FilterState>) => void;
    clearFilters: () => void;
    setIsSearching: (isSearching: boolean) => void;

    // Computed
    getTotalSearches: () => number;
    getOverallConversionRate: () => number;
}

const defaultFilters: FilterState = {
    timeRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        label: 'Last 7 days',
    },
    dagIds: [],
    status: [],
    searchQuery: '',
};

export const useSearchStore = create<SearchState>((set, get) => ({
    funnelData: [],
    topQueries: [],
    userSegments: [],
    filterState: defaultFilters,
    searchQuery: '',
    debouncedQuery: '',
    isSearching: false,

    setFunnelData: (data) => set({ funnelData: data }),

    setTopQueries: (queries) => set({ topQueries: queries }),

    setUserSegments: (segments) => set({ userSegments: segments }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    setDebouncedQuery: (query) => set({ debouncedQuery: query }),

    setFilters: (filters) => set((state) => ({
        filterState: { ...state.filterState, ...filters },
    })),

    clearFilters: () => set({ filterState: defaultFilters }),

    setIsSearching: (isSearching) => set({ isSearching }),

    getTotalSearches: () => {
        const { funnelData } = get();
        return funnelData.reduce((sum, d) => sum + d.searches, 0);
    },

    getOverallConversionRate: () => {
        const { funnelData } = get();
        if (funnelData.length === 0) return 0;
        const totalSearches = funnelData.reduce((sum, d) => sum + d.searches, 0);
        const totalConversions = funnelData.reduce((sum, d) => sum + d.conversions, 0);
        return totalSearches > 0 ? (totalConversions / totalSearches) * 100 : 0;
    },
}));
