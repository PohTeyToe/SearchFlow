import type { DAG, DAGRun, DataQualityMetric, RecordCount, PipelineMetrics, SearchFunnelData, SearchQuery, UserSegment } from '../types';
import { sleep } from '../utils';

// Simulated delay for API calls
const API_DELAY = 300;

// Mock DAGs based on actual SearchFlow project
const mockDags: DAG[] = [
    {
        dagId: 'searchflow_ingestion',
        description: 'Ingests raw events from JSONL files to DuckDB',
        isPaused: false,
        schedule: '0 * * * *',
        tags: ['ingestion', 'duckdb'],
        lastRun: {
            dagId: 'searchflow_ingestion',
            runId: 'run_20240131_1200',
            state: 'success',
            startDate: new Date(Date.now() - 3600000).toISOString(),
            endDate: new Date(Date.now() - 3570000).toISOString(),
            duration: 30,
        },
    },
    {
        dagId: 'searchflow_transformation',
        description: 'Runs dbt models: staging → intermediate → marts',
        isPaused: false,
        schedule: '15 * * * *',
        tags: ['dbt', 'transformation'],
        lastRun: {
            dagId: 'searchflow_transformation',
            runId: 'run_20240131_1215',
            state: 'success',
            startDate: new Date(Date.now() - 3300000).toISOString(),
            endDate: new Date(Date.now() - 3266000).toISOString(),
            duration: 34,
        },
    },
    {
        dagId: 'searchflow_reverse_etl',
        description: 'Syncs data marts to Redis and Postgres',
        isPaused: false,
        schedule: '30 * * * *',
        tags: ['reverse-etl', 'sync'],
        lastRun: {
            dagId: 'searchflow_reverse_etl',
            runId: 'run_20240131_1230',
            state: 'running',
            startDate: new Date(Date.now() - 60000).toISOString(),
            duration: 3,
        },
    },
];

// Generate mock run history
function generateMockRuns(): DAGRun[] {
    const runs: DAGRun[] = [];
    const states: ('success' | 'failed')[] = ['success', 'success', 'success', 'success', 'failed'];

    mockDags.forEach(dag => {
        for (let i = 0; i < 24; i++) {
            const startDate = new Date(Date.now() - (i + 1) * 3600000);
            const state = states[Math.floor(Math.random() * states.length)];
            const duration = Math.floor(Math.random() * 60) + 20;

            runs.push({
                dagId: dag.dagId,
                runId: `run_${dag.dagId}_${i}`,
                state,
                startDate: startDate.toISOString(),
                endDate: new Date(startDate.getTime() + duration * 1000).toISOString(),
                duration,
            });
        }
    });

    return runs;
}

// Mock data quality metrics based on actual dbt tests
const mockQualityMetrics: DataQualityMetric[] = [
    { testName: 'not_null_stg_search_events_session_id', model: 'stg_search_events', status: 'pass', executionTime: 0.12 },
    { testName: 'unique_stg_search_events_event_id', model: 'stg_search_events', status: 'pass', executionTime: 0.08 },
    { testName: 'not_null_stg_click_events_click_id', model: 'stg_click_events', status: 'pass', executionTime: 0.11 },
    { testName: 'relationships_stg_clicks_to_searches', model: 'stg_click_events', status: 'pass', executionTime: 0.15 },
    { testName: 'not_null_stg_conversions_conversion_id', model: 'stg_conversions', status: 'pass', executionTime: 0.09 },
    { testName: 'accepted_values_conversion_type', model: 'stg_conversions', status: 'pass', executionTime: 0.07 },
    { testName: 'unique_dim_users_user_id', model: 'dim_users', status: 'pass', executionTime: 0.14 },
    { testName: 'not_null_dim_users_first_seen', model: 'dim_users', status: 'pass', executionTime: 0.06 },
    { testName: 'unique_fct_search_funnel_session_id', model: 'fct_search_funnel', status: 'pass', executionTime: 0.18 },
    { testName: 'assert_positive_click_through_rate', model: 'fct_search_funnel', status: 'pass', executionTime: 0.21 },
    { testName: 'not_null_mart_user_segments_segment_id', model: 'mart_user_segments', status: 'pass', executionTime: 0.13 },
    { testName: 'unique_mart_recommendations_user_id_product_id', model: 'mart_recommendations', status: 'fail', executionTime: 0.25, message: '2 duplicate rows found' },
    // Add more to reach 78 tests (97.5% pass rate like in README)
    ...Array.from({ length: 66 }, (_, i) => ({
        testName: `test_${i + 13}`,
        model: ['stg_search_events', 'stg_click_events', 'dim_users', 'fct_search_funnel'][i % 4],
        status: 'pass' as const,
        executionTime: Math.random() * 0.3 + 0.05,
    })),
];

// Mock record counts
const mockRecordCounts: RecordCount[] = [
    { table: 'raw_search_events', count: 6547, previousCount: 6102, delta: 445, deltaPercent: 7.3, updatedAt: new Date().toISOString() },
    { table: 'raw_click_events', count: 2891, previousCount: 2654, delta: 237, deltaPercent: 8.9, updatedAt: new Date().toISOString() },
    { table: 'raw_conversions', count: 1358, previousCount: 1287, delta: 71, deltaPercent: 5.5, updatedAt: new Date().toISOString() },
    { table: 'stg_search_events', count: 6547, previousCount: 6102, delta: 445, deltaPercent: 7.3, updatedAt: new Date().toISOString() },
    { table: 'stg_click_events', count: 2891, previousCount: 2654, delta: 237, deltaPercent: 8.9, updatedAt: new Date().toISOString() },
    { table: 'stg_conversions', count: 1358, previousCount: 1287, delta: 71, deltaPercent: 5.5, updatedAt: new Date().toISOString() },
    { table: 'dim_users', count: 1607, previousCount: 1523, delta: 84, deltaPercent: 5.5, updatedAt: new Date().toISOString() },
    { table: 'fct_search_funnel', count: 170, previousCount: 158, delta: 12, deltaPercent: 7.6, updatedAt: new Date().toISOString() },
    { table: 'mart_user_segments', count: 1607, previousCount: 1523, delta: 84, deltaPercent: 5.5, updatedAt: new Date().toISOString() },
    { table: 'mart_recommendations', count: 67, previousCount: 62, delta: 5, deltaPercent: 8.1, updatedAt: new Date().toISOString() },
];

// Mock pipeline metrics
const mockPipelineMetrics: PipelineMetrics = {
    totalRuns: 72,
    successfulRuns: 68,
    failedRuns: 4,
    averageDuration: 68,
    lastRunTime: new Date(Date.now() - 60000).toISOString(),
};

// Generate search funnel data for last 7 days
function generateFunnelData(): SearchFunnelData[] {
    const data: SearchFunnelData[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const searches = Math.floor(Math.random() * 500) + 800;
        const clicks = Math.floor(searches * (0.25 + Math.random() * 0.15));
        const conversions = Math.floor(clicks * (0.08 + Math.random() * 0.08));

        data.push({
            date: date.toISOString().split('T')[0],
            searches,
            clicks,
            conversions,
            clickThroughRate: (clicks / searches) * 100,
            conversionRate: (conversions / searches) * 100,
        });
    }
    return data;
}

// Mock top search queries
const mockTopQueries: SearchQuery[] = [
    { query: 'password manager', count: 1247, avgPosition: 1.2, clickRate: 0.45 },
    { query: 'secure login', count: 892, avgPosition: 1.5, clickRate: 0.38 },
    { query: 'team sharing', count: 654, avgPosition: 2.1, clickRate: 0.31 },
    { query: 'browser extension', count: 521, avgPosition: 1.8, clickRate: 0.42 },
    { query: 'two factor auth', count: 487, avgPosition: 2.4, clickRate: 0.28 },
    { query: 'vault access', count: 423, avgPosition: 1.9, clickRate: 0.35 },
    { query: 'password generator', count: 398, avgPosition: 1.3, clickRate: 0.52 },
    { query: 'import passwords', count: 312, avgPosition: 2.7, clickRate: 0.24 },
];

// Mock user segments
const mockUserSegments: UserSegment[] = [
    { segmentId: 'seg_power', name: 'Power Users', userCount: 234, avgSearches: 45.2, conversionRate: 12.5 },
    { segmentId: 'seg_casual', name: 'Casual Users', userCount: 892, avgSearches: 8.3, conversionRate: 4.2 },
    { segmentId: 'seg_new', name: 'New Users', userCount: 312, avgSearches: 3.1, conversionRate: 2.1 },
    { segmentId: 'seg_dormant', name: 'Dormant Users', userCount: 169, avgSearches: 0.5, conversionRate: 0.3 },
];

// API Functions
export const mockApi = {
    async getDags(): Promise<DAG[]> {
        await sleep(API_DELAY);
        return mockDags;
    },

    async getDagRuns(dagId?: string): Promise<DAGRun[]> {
        await sleep(API_DELAY);
        const runs = generateMockRuns();
        return dagId ? runs.filter(r => r.dagId === dagId) : runs;
    },

    async getQualityMetrics(): Promise<DataQualityMetric[]> {
        await sleep(API_DELAY);
        return mockQualityMetrics;
    },

    async getRecordCounts(): Promise<RecordCount[]> {
        await sleep(API_DELAY);
        return mockRecordCounts;
    },

    async getPipelineMetrics(): Promise<PipelineMetrics> {
        await sleep(API_DELAY);
        return mockPipelineMetrics;
    },

    async getSearchFunnelData(): Promise<SearchFunnelData[]> {
        await sleep(API_DELAY);
        return generateFunnelData();
    },

    async getTopQueries(): Promise<SearchQuery[]> {
        await sleep(API_DELAY);
        return mockTopQueries;
    },

    async getUserSegments(): Promise<UserSegment[]> {
        await sleep(API_DELAY);
        return mockUserSegments;
    },

    async search(query: string): Promise<SearchQuery[]> {
        await sleep(API_DELAY + 200);
        if (!query.trim()) return mockTopQueries;
        return mockTopQueries.filter(q =>
            q.query.toLowerCase().includes(query.toLowerCase())
        );
    },

    async getRawLargeDataset(): Promise<{ timestamp: number; value: number; type: 'search' | 'booking' | 'error' }[]> {
        // SCENARIO: Simulating a heavy payload that causes Main Thread freeze if not handled
        await sleep(600); // Slightly longer delay for "large" data

        const count = 15000; // 15k points to match the "10,000+" claim
        const data = new Array(count);
        const now = Date.now();
        const twoWeeks = 14 * 24 * 60 * 60 * 1000;

        for (let i = 0; i < count; i++) {
            // Generate clustered data to simulate real patterns (peaks during day vs night)
            const timeOffset = Math.floor((i / count) * twoWeeks);
            // Add some randomness to value
            const baseValue = 50 + Math.sin(i / 100) * 30 + Math.random() * 20;

            data[i] = {
                timestamp: now - twoWeeks + timeOffset,
                value: Math.max(0, baseValue),
                type: Math.random() > 0.95 ? 'error' : (Math.random() > 0.8 ? 'booking' : 'search')
            };
        }

        return data;
    }
};
