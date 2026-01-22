// Pipeline Types
export interface DAGRun {
    dagId: string;
    runId: string;
    state: 'running' | 'success' | 'failed' | 'queued';
    startDate: string;
    endDate?: string;
    duration?: number;
}

export interface DAG {
    dagId: string;
    description: string;
    isPaused: boolean;
    lastRun?: DAGRun;
    schedule: string;
    tags: string[];
}

export interface Task {
    taskId: string;
    dagId: string;
    state: 'running' | 'success' | 'failed' | 'pending' | 'skipped';
    startDate?: string;
    endDate?: string;
    tryNumber: number;
}

// Metrics Types
export interface DataQualityMetric {
    testName: string;
    model: string;
    status: 'pass' | 'fail' | 'warn';
    executionTime: number;
    rowsAffected?: number;
    message?: string;
}

export interface RecordCount {
    table: string;
    count: number;
    previousCount: number;
    delta: number;
    deltaPercent: number;
    updatedAt: string;
}

export interface PipelineMetrics {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDuration: number;
    lastRunTime: string;
}

// Search Analytics Types
export interface SearchFunnelData {
    date: string;
    searches: number;
    clicks: number;
    conversions: number;
    clickThroughRate: number;
    conversionRate: number;
}

export interface SearchQuery {
    query: string;
    count: number;
    avgPosition: number;
    clickRate: number;
}

export interface UserSegment {
    segmentId: string;
    name: string;
    userCount: number;
    avgSearches: number;
    conversionRate: number;
}

// Dashboard Types
export interface TimeRange {
    start: string;
    end: string;
    label: string;
}

export interface FilterState {
    timeRange: TimeRange;
    dagIds: string[];
    status: ('running' | 'success' | 'failed')[];
    searchQuery: string;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    status: 'success' | 'error';
    message?: string;
    timestamp: string;
}

// Chart Types
export interface ChartDataPoint {
    name: string;
    value: number;
    [key: string]: string | number;
}

export interface FunnelStep {
    name: string;
    value: number;
    fill: string;
}
