import type { DAG, DAGRun, DataQualityMetric, RecordCount, PipelineMetrics, SearchFunnelData, SearchQuery, UserSegment, User, UserProfile, ShapFactor, ActivityEvent } from '../types';
import type { UserSegment2 } from '../types';
import { sleep } from '../utils';

// Simulated delay for API calls
const API_DELAY = 300;

// --- Time-based helpers for dynamic data ---

/** Returns a multiplier (0.4 to 1.0) based on the current hour to simulate business-hour traffic */
function timeOfDayMultiplier(): number {
    const hour = new Date().getHours();
    // Peak hours: 9-17, trough: 0-6
    if (hour >= 9 && hour <= 17) return 0.85 + Math.sin((hour - 9) * Math.PI / 8) * 0.15;
    if (hour >= 18 && hour <= 22) return 0.6 + (22 - hour) * 0.05;
    return 0.4 + hour * 0.03; // late night / early morning
}

/** Deterministic micro-noise based on a seed and the current ~3-second window */
function microNoise(seed: number, amplitude: number): number {
    const window = Math.floor(Date.now() / 3000); // changes every 3 seconds
    const s = ((seed * 16807 + window * 31) % 2147483647) / 2147483647;
    return (s - 0.5) * 2 * amplitude; // range: [-amplitude, +amplitude]
}

/** Deterministic drift (±pct%) for a value, changing every ~3 seconds */
function driftValue(base: number, seed: number, pct: number = 0.03): number {
    return Math.round(base * (1 + microNoise(seed, pct)));
}

// Mock DAGs — now generated dynamically so pipeline statuses rotate over time
function generateDags(): DAG[] {
    const now = Date.now();
    const seconds = Math.floor(now / 1000);

    // Reverse ETL cycles between 'running' and 'success' every 30 seconds
    const reverseEtlCycle = Math.floor(seconds / 30) % 2;
    const reverseEtlState: 'running' | 'success' = reverseEtlCycle === 0 ? 'running' : 'success';
    const reverseEtlStart = reverseEtlState === 'running'
        ? new Date(now - (seconds % 30) * 1000).toISOString()
        : new Date(now - 45000).toISOString();
    const reverseEtlEnd = reverseEtlState === 'success'
        ? new Date(now - 15000).toISOString()
        : undefined;

    // Ingestion shows as 'running' for ~15s every ~2 minutes
    const ingestionCycle = seconds % 120;
    const ingestionState: 'running' | 'success' = ingestionCycle < 15 ? 'running' : 'success';
    const ingestionStart = ingestionState === 'running'
        ? new Date(now - ingestionCycle * 1000).toISOString()
        : new Date(now - Math.floor(seconds % 3600) * 1000).toISOString();
    const ingestionEnd = ingestionState === 'success'
        ? new Date(now - Math.max(30000, (ingestionCycle - 15) * 1000)).toISOString()
        : undefined;

    return [
        {
            dagId: 'searchflow_ingestion',
            description: 'Ingests raw events from JSONL files to DuckDB',
            isPaused: false,
            schedule: '0 * * * *',
            tags: ['ingestion', 'duckdb'],
            lastRun: {
                dagId: 'searchflow_ingestion',
                runId: `run_ingestion_${Math.floor(seconds / 120)}`,
                state: ingestionState,
                startDate: ingestionStart,
                endDate: ingestionEnd,
                duration: ingestionState === 'running' ? ingestionCycle : 30,
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
                runId: `run_transform_${Math.floor(seconds / 3600)}`,
                state: 'success',
                startDate: new Date(now - Math.floor(seconds % 3600) * 1000 - 34000).toISOString(),
                endDate: new Date(now - Math.floor(seconds % 3600) * 1000).toISOString(),
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
                runId: `run_retl_${Math.floor(seconds / 60)}`,
                state: reverseEtlState,
                startDate: reverseEtlStart,
                endDate: reverseEtlEnd,
                duration: reverseEtlState === 'running' ? (seconds % 30) : 30,
            },
        },
    ];
}

// Generate mock run history
function generateMockRuns(): DAGRun[] {
    const runs: DAGRun[] = [];
    const states: ('success' | 'failed')[] = ['success', 'success', 'success', 'success', 'failed'];
    const dags = generateDags();

    dags.forEach(dag => {
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

// Mock record counts — grow slowly over time based on minutes since midnight
function generateRecordCounts(): RecordCount[] {
    const now = new Date();
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();

    // Each table has a base count + growth rate (records per minute)
    const tables: { table: string; base: number; prevBase: number; rate: number }[] = [
        { table: 'raw_search_events', base: 6547, prevBase: 6102, rate: 0.45 },
        { table: 'raw_click_events', base: 2891, prevBase: 2654, rate: 0.20 },
        { table: 'raw_conversions', base: 1358, prevBase: 1287, rate: 0.08 },
        { table: 'stg_search_events', base: 6547, prevBase: 6102, rate: 0.45 },
        { table: 'stg_click_events', base: 2891, prevBase: 2654, rate: 0.20 },
        { table: 'stg_conversions', base: 1358, prevBase: 1287, rate: 0.08 },
        { table: 'dim_users', base: 1607, prevBase: 1523, rate: 0.05 },
        { table: 'fct_search_funnel', base: 170, prevBase: 158, rate: 0.02 },
        { table: 'mart_user_segments', base: 1607, prevBase: 1523, rate: 0.05 },
        { table: 'mart_recommendations', base: 67, prevBase: 62, rate: 0.01 },
    ];

    return tables.map(({ table, base, prevBase, rate }, idx) => {
        const growth = Math.floor(minutesSinceMidnight * rate);
        const count = base + growth;
        const delta = count - prevBase;
        const deltaPercent = Math.round((delta / prevBase) * 1000) / 10;
        return {
            table,
            count: driftValue(count, idx + 500, 0.005),
            previousCount: prevBase,
            delta,
            deltaPercent,
            updatedAt: now.toISOString(),
        };
    });
}

// Mock pipeline metrics
const mockPipelineMetrics: PipelineMetrics = {
    totalRuns: 72,
    successfulRuns: 68,
    failedRuns: 4,
    averageDuration: 68,
    lastRunTime: new Date(Date.now() - 60000).toISOString(),
};

// Generate search funnel data for last 7 days with time-of-day patterns and micro-drift
function generateFunnelData(): SearchFunnelData[] {
    const data: SearchFunnelData[] = [];
    const todMultiplier = timeOfDayMultiplier();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const daySeed = date.getDate() * 1000 + date.getMonth();

        // Base values seeded by day for consistency, but today gets time-of-day modulation
        const rng = seededRandom(daySeed);
        const baseSearches = Math.floor(rng() * 500) + 800;
        const dayMultiplier = i === 0 ? todMultiplier : (0.7 + rng() * 0.3);
        const searches = driftValue(Math.floor(baseSearches * dayMultiplier), daySeed + 1);

        const clickRatio = 0.25 + (rng() * 0.15);
        const clicks = driftValue(Math.floor(searches * clickRatio), daySeed + 2);
        const convRatio = 0.08 + (rng() * 0.08);
        const conversions = driftValue(Math.floor(clicks * convRatio), daySeed + 3);

        data.push({
            date: date.toISOString().split('T')[0],
            searches,
            clicks,
            conversions,
            clickThroughRate: Math.round((clicks / searches) * 10000) / 100,
            conversionRate: Math.round((conversions / searches) * 10000) / 100,
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

// Feature definitions for SHAP values
const FEATURE_LABELS: Record<string, string> = {
    lead_time: 'Lead time (days)',
    total_stay_nights: 'Total stay nights',
    adr: 'Avg daily rate ($)',
    is_repeated_guest: 'Repeated guest',
    previous_cancellations: 'Previous cancellations',
    previous_bookings_not_canceled: 'Previous completed',
    booking_changes: 'Booking changes',
    total_of_special_requests: 'Special requests',
    days_in_waiting_list: 'Waiting list days',
    guests_total: 'Total guests',
    deposit_type_encoded: 'Deposit type',
    market_segment_encoded: 'Market segment',
    customer_type_encoded: 'Customer type',
    weekend_stay_ratio: 'Weekend ratio',
};

const FEATURES = Object.keys(FEATURE_LABELS);

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return s / 2147483647;
    };
}

// Segment-specific feature biases: which features matter most for each segment
const SEGMENT_BIASES: Record<string, number[]> = {
    high_value:       [0.5, 0.3, 0.8, 2.5, 1.2, 0.6, 1.5, 2.0, 0.4, 1.8],
    at_risk:          [1.8, 2.5, 1.2, 0.5, 0.8, 1.5, 0.6, 0.3, 2.0, 0.4],
    new_user:         [2.0, 0.8, 0.5, 0.3, 1.5, 2.2, 0.6, 0.4, 1.2, 1.8],
    regular:          [0.6, 1.5, 2.0, 1.8, 0.4, 0.8, 1.2, 0.5, 0.3, 2.2],
    abandoned_search: [1.2, 1.8, 2.5, 0.4, 0.6, 0.8, 0.3, 0.5, 2.2, 1.5],
};

function generateShapValues(probability: number, seed: number, segment?: string): ShapFactor[] {
    const rng = seededRandom(seed * 7919);  // larger prime for more spread
    const baseValue = 0.35;
    const diff = probability - baseValue;
    const biases = segment && SEGMENT_BIASES[segment] ? SEGMENT_BIASES[segment] : FEATURES.map(() => 1);

    // Generate raw values with segment-specific biases for variety
    const rawValues = FEATURES.map((_, i) => {
        const base = (rng() - 0.5) * 0.4;
        // Apply bias and per-user variation
        return base * biases[i] * (0.5 + rng());
    });
    const rawSum = rawValues.reduce((a, b) => a + b, 0);
    const scaled = rawSum === 0
        ? rawValues.map(() => diff / FEATURES.length)
        : rawValues.map(v => (v / rawSum) * diff);

    return FEATURES.map((feature, i) => ({
        feature,
        featureLabel: FEATURE_LABELS[feature],
        value: Math.round(scaled[i] * 1000) / 1000,
        direction: (scaled[i] >= 0 ? 'increases' : 'decreases') as 'increases' | 'decreases',
    })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}

function generateMockUsers(): User[] {
    const segments: { segment: UserSegment2; churnRange: [number, number]; count: number }[] = [
        { segment: 'high_value', churnRange: [0.08, 0.30], count: 6 },
        { segment: 'at_risk', churnRange: [0.65, 0.93], count: 7 },
        { segment: 'new_user', churnRange: [0.28, 0.55], count: 5 },
        { segment: 'regular', churnRange: [0.12, 0.38], count: 6 },
        { segment: 'abandoned_search', churnRange: [0.70, 0.96], count: 6 },
    ];

    const users: User[] = [];
    let id = 1001;

    for (const { segment, churnRange, count } of segments) {
        for (let i = 0; i < count; i++) {
            const rng = seededRandom(id * 37);
            const baseProbability = Math.round((churnRange[0] + rng() * (churnRange[1] - churnRange[0])) * 100) / 100;
            // Add micro-fluctuation: ±0.01, deterministic within a ~5-second window
            const noise = microNoise(id, 0.01);
            const probability = Math.round(Math.max(0, Math.min(1, baseProbability + noise)) * 100) / 100;
            const riskLevel = probability < 0.3 ? 'low' : probability < 0.7 ? 'medium' : 'high';
            const shapValues = generateShapValues(probability, id, segment);
            const daysAgo = Math.floor(rng() * 30) + 1;

            users.push({
                userId: `user_${id}`,
                segment,
                lastActive: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
                churnPrediction: {
                    probability,
                    riskLevel: riskLevel as 'low' | 'medium' | 'high',
                    topFactors: shapValues.slice(0, 3),
                    baseValue: 0.35,
                },
            });
            id++;
        }
    }

    return users;
}

// Users are regenerated on each call to getUsers() for live churn fluctuation
// Keep a cached version for chat lookups (stable within a session)
let cachedUsers: User[] | null = null;
function getMockUsers(): User[] {
    cachedUsers = generateMockUsers();
    return cachedUsers;
}
const mockUsers = generateMockUsers(); // initial for chat responses

const TRAVEL_QUERIES = [
    'flights to cancun', 'tokyo hotels march', 'cheap flights europe',
    'bali resorts all inclusive', 'paris weekend deals', 'caribbean cruise 2024',
    'nyc to london direct', 'ski resorts colorado', 'beach vacation under 1000',
    'rome airbnb center', 'hawaii honeymoon packages', 'last minute flights',
    'business class deals asia', 'family resort mexico', 'backpacking southeast asia',
];

const DESTINATIONS = [
    { destination: 'Cancun, Mexico', reason: 'Matches beach + budget preferences' },
    { destination: 'Tokyo, Japan', reason: 'High engagement with Asia content' },
    { destination: 'Barcelona, Spain', reason: 'Similar users booked frequently' },
    { destination: 'Bali, Indonesia', reason: 'Trending destination in segment' },
    { destination: 'Reykjavik, Iceland', reason: 'Matches adventure travel pattern' },
    { destination: 'Lisbon, Portugal', reason: 'Price point aligns with history' },
    { destination: 'Banff, Canada', reason: 'Seasonal ski interest detected' },
    { destination: 'Santorini, Greece', reason: 'High affinity score for islands' },
];

const ACTIVITY_TEMPLATES: Record<ActivityEvent['type'], string[]> = {
    search: [
        'Searched for "flights to Cancun"',
        'Searched for "Tokyo hotels March"',
        'Searched for "cheap flights Europe"',
        'Searched for "Bali resorts all inclusive"',
        'Searched for "Paris weekend deals"',
        'Searched for "Caribbean cruise 2024"',
    ],
    click: [
        'Clicked on Cancun resort listing',
        'Viewed Tokyo flight details',
        'Opened Barcelona hotel page',
        'Clicked on Bali villa deal',
        'Viewed Lisbon Airbnb listing',
        'Expanded cruise itinerary details',
    ],
    abandonment: [
        'Left search results without clicking',
        'Abandoned checkout for flight booking',
        'Closed tab after viewing prices',
        'Exited during payment step',
        'Dropped off at seat selection',
        'Left after filtering zero results',
    ],
    booking: [
        'Booked round-trip to Barcelona',
        'Confirmed hotel in Santorini',
        'Completed cruise reservation',
        'Booked rental car in Lisbon',
        'Reserved adventure tour in Reykjavik',
        'Confirmed Bali villa for 5 nights',
    ],
};

function generateActivityEvents(seed: number): ActivityEvent[] {
    const rng = seededRandom(seed * 41);
    const types: ActivityEvent['type'][] = ['search', 'click', 'abandonment', 'booking'];
    const weights = [0.4, 0.3, 0.2, 0.1]; // search-heavy distribution

    return Array.from({ length: 12 }, (_, i) => {
        const roll = rng();
        let cumulative = 0;
        let type: ActivityEvent['type'] = 'search';
        for (let j = 0; j < weights.length; j++) {
            cumulative += weights[j];
            if (roll < cumulative) {
                type = types[j];
                break;
            }
        }
        const templates = ACTIVITY_TEMPLATES[type];
        const description = templates[Math.floor(rng() * templates.length)];
        const hoursAgo = (i + 1) * 2 + Math.floor(rng() * 6);

        return {
            type,
            description,
            timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
        };
    });
}

function generateUserProfile(userId: string): UserProfile | null {
    const user = mockUsers.find(u => u.userId === userId);
    if (!user) return null;

    const idNum = parseInt(userId.split('_')[1]);
    const rng = seededRandom(idNum * 13);
    const shapValues = generateShapValues(user.churnPrediction.probability, idNum, user.segment);

    const searchHistory = Array.from({ length: 8 }, (_, i) => {
        const qi = Math.floor(rng() * TRAVEL_QUERIES.length);
        return {
            query: TRAVEL_QUERIES[qi],
            timestamp: new Date(Date.now() - (i + 1) * 3600000 * (2 + rng() * 10)).toISOString(),
            resultsCount: Math.floor(rng() * 150) + 5,
            clicked: rng() > 0.4,
            destination: rng() > 0.5 ? DESTINATIONS[Math.floor(rng() * DESTINATIONS.length)].destination : undefined,
        };
    });

    const numRecs = 3 + Math.floor(rng() * 3);
    const recommendations = DESTINATIONS
        .sort(() => rng() - 0.5)
        .slice(0, numRecs)
        .map(d => ({
            ...d,
            score: Math.round((0.6 + rng() * 0.35) * 100) / 100,
        }));

    const activityEvents = generateActivityEvents(idNum);

    return {
        ...user,
        shapValues,
        searchHistory,
        recommendations,
        activityEvents,
    };
}

// --- Live realtime events ---
const REALTIME_USER_IDS = [
    'user_1001', 'user_1004', 'user_1008', 'user_1012', 'user_1017',
    'user_1021', 'user_1025', 'user_1003', 'user_1015', 'user_1029',
];
const REALTIME_QUERIES = [
    'flights to cancun', 'tokyo hotels march', 'cheap flights europe',
    'bali resorts all inclusive', 'paris weekend deals', 'caribbean cruise 2024',
    'ski resorts colorado', 'beach vacation under 1000', 'last minute flights',
    'hawaii honeymoon packages', 'rome airbnb center', 'nyc to london direct',
];
const REALTIME_DESTINATIONS = [
    'Cancun resort listing', 'Tokyo flight details', 'Barcelona hotel page',
    'Bali villa deal', 'Lisbon Airbnb listing', 'cruise itinerary details',
    'Reykjavik tour package', 'Santorini sunset villa', 'Banff ski lodge',
];

function generateRealtimeEvents(): { type: string; message: string; timestamp: string }[] {
    const now = Date.now();
    const secondSlot = Math.floor(now / 5000); // changes every 5 seconds
    const eventCount = 1 + (secondSlot % 3); // 1-3 events

    const events: { type: string; message: string; timestamp: string }[] = [];
    for (let i = 0; i < eventCount; i++) {
        const seed = secondSlot * 7 + i * 13;
        const userIdx = ((seed * 16807) % 2147483647) % REALTIME_USER_IDS.length;
        const userId = REALTIME_USER_IDS[userIdx];
        const eventType = seed % 3; // 0=search, 1=click, 2=abandon
        const secsAgo = (i + 1) * 3 + (seed % 8);

        let type: string;
        let message: string;
        if (eventType === 0) {
            const qIdx = ((seed * 31) % 2147483647) % REALTIME_QUERIES.length;
            type = 'search';
            message = `${userId} searched for "${REALTIME_QUERIES[qIdx]}"`;
        } else if (eventType === 1) {
            const dIdx = ((seed * 31) % 2147483647) % REALTIME_DESTINATIONS.length;
            type = 'click';
            message = `${userId} clicked ${REALTIME_DESTINATIONS[dIdx]}`;
        } else {
            type = 'abandonment';
            message = `${userId} abandoned search`;
        }

        events.push({
            type,
            message,
            timestamp: new Date(now - secsAgo * 1000).toISOString(),
        });
    }

    return events;
}

// Mock chat responses
function getMockChatResponse(question: string): { answer: string; toolsUsed: string[] } {
    const q = question.toLowerCase();

    if (q.includes('churn') || q.includes('risk') || q.includes('user_')) {
        const userMatch = q.match(/user_(\d+)/);
        if (userMatch) {
            const user = mockUsers.find(u => u.userId === `user_${userMatch[1]}`);
            if (user) {
                const factors = user.churnPrediction.topFactors
                    .map(f => `• **${f.featureLabel}**: ${f.value > 0 ? '+' : ''}${f.value.toFixed(3)} (${f.direction} risk)`)
                    .join('\n');
                return {
                    answer: `**${user.userId}** has a churn probability of **${(user.churnPrediction.probability * 100).toFixed(0)}%** (${user.churnPrediction.riskLevel} risk).\n\nSegment: ${user.segment.replace('_', ' ')}\n\nTop contributing factors:\n${factors}\n\nRecommendation: ${user.churnPrediction.riskLevel === 'high' ? 'Trigger a personalized re-engagement campaign with destination deals matching their search history.' : 'Continue monitoring — no immediate action needed.'}`,
                    toolsUsed: ['churn_prediction', 'shap_explainer'],
                };
            }
        }
        const atRiskCount = mockUsers.filter(u => u.churnPrediction.riskLevel === 'high').length;
        return {
            answer: `Currently **${atRiskCount} users** are classified as high churn risk (>70% probability). The most common risk factors are high days since last activity and low search-to-click ratios. Check the Users page for the full breakdown.`,
            toolsUsed: ['churn_prediction', 'sql_query'],
        };
    }

    if (q.includes('conversion') || q.includes('funnel') || q.includes('rate')) {
        return {
            answer: `Over the last 7 days:\n• **Total searches:** ~7,200\n• **Click-through rate:** ~31%\n• **Booking conversion:** ~4.8%\n• **Revenue at risk:** ~$38,000 from funnel drop-offs\n\nThe biggest drop-off is between search and click — users aren't finding relevant results on the first page. Consider improving search ranking for long-tail destination queries.`,
            toolsUsed: ['sql_query', 'funnel_analysis'],
        };
    }

    if (q.includes('destination') || q.includes('trending') || q.includes('popular')) {
        return {
            answer: `Top trending destinations this week:\n1. **Cancun, Mexico** — 340 searches (+18%)\n2. **Tokyo, Japan** — 285 searches (+24%)\n3. **Barcelona, Spain** — 231 searches (+12%)\n4. **Bali, Indonesia** — 198 searches (+31%)\n5. **Lisbon, Portugal** — 167 searches (+9%)\n\nBali is seeing the fastest growth. Consider featuring it in the homepage carousel.`,
            toolsUsed: ['sql_query', 'recommendation_engine'],
        };
    }

    if (q.includes('segment') || q.includes('user')) {
        return {
            answer: `User segment breakdown:\n• **High Value:** 6 users (avg churn 19%)\n• **Regular:** 6 users (avg churn 25%)\n• **New Users:** 5 users (avg churn 42%)\n• **At Risk:** 7 users (avg churn 79%)\n• **Abandoned Search:** 6 users (avg churn 83%)\n\nThe at_risk and abandoned_search segments need immediate attention — they represent 43% of users but generate the lowest booking rates.`,
            toolsUsed: ['sql_query', 'churn_prediction'],
        };
    }

    return {
        answer: `I can help with churn analysis, funnel metrics, destination trends, and user segments. Try asking:\n• "Why is user_1008 at risk of churning?"\n• "What's the conversion rate this week?"\n• "Which destinations are trending?"\n• "Break down the user segments"`,
        toolsUsed: [],
    };
}

// API Functions
export const mockApi = {
    async getDags(): Promise<DAG[]> {
        await sleep(API_DELAY);
        return generateDags();
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
        return generateRecordCounts();
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

    async getUsers(): Promise<User[]> {
        await sleep(API_DELAY);
        return getMockUsers();
    },

    async getUserProfile(userId: string): Promise<UserProfile | null> {
        await sleep(API_DELAY);
        return generateUserProfile(userId);
    },

    async askAssistant(question: string): Promise<{ answer: string; toolsUsed: string[] }> {
        // Try real API first, fall back to mock
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('http://localhost:8001/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.ok) return await res.json();
        } catch {
            // Fall back to mock
        }
        await sleep(800);
        return getMockChatResponse(question);
    },

    async getRealtimeEvents(): Promise<{ type: string; message: string; timestamp: string }[]> {
        await sleep(100);
        return generateRealtimeEvents();
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
