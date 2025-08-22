import React, { useState, useCallback } from 'react';
import { MainLayout } from '../components/layout';
import { SearchInput, ResultsTable } from '../components/search';
import { ChartContainer, HorizontalFunnel, AreaChart } from '../components/charts';
import { StatCard } from '../components/metrics/StatCard';
import { Card } from '../components/ui/Card';
import { Tabs, TabList, Tab, TabPanel } from '../components/ui/Tabs';
import { useSearchFunnel, useTopQueries, useUserSegments, useSearch, useDebounce } from '../hooks';
import { useSearchStore } from '../stores';
import { SkeletonCard, SkeletonTable } from '../components/ui';
import { Search, Users, TrendingUp, BarChart3 } from 'lucide-react';

export const SearchAnalyticsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedQuery = useDebounce(searchQuery, 300);

    const { data: funnelData, isLoading: funnelLoading } = useSearchFunnel();
    const { data: topQueries, isLoading: queriesLoading } = useTopQueries();
    const { data: userSegments, isLoading: segmentsLoading } = useUserSegments();
    const { data: searchResults, isLoading: searchLoading } = useSearch(debouncedQuery);

    const { isSearching } = useSearchStore();

    // Calculate stats
    const totalSearches = funnelData?.reduce((sum, d) => sum + d.searches, 0) || 0;
    const totalClicks = funnelData?.reduce((sum, d) => sum + d.clicks, 0) || 0;
    const totalConversions = funnelData?.reduce((sum, d) => sum + d.conversions, 0) || 0;
    const avgClickRate = totalSearches > 0 ? ((totalClicks / totalSearches) * 100) : 0;
    const avgConversionRate = totalSearches > 0 ? ((totalConversions / totalSearches) * 100) : 0;

    // Funnel chart data
    const funnelChartData = [
        { name: 'Searches', value: totalSearches, fill: '#3b82f6' },
        { name: 'Clicks', value: totalClicks, fill: '#8b5cf6' },
        { name: 'Conversions', value: totalConversions, fill: '#10b981' },
    ];

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    return (
        <MainLayout
            title="Search Analytics"
            subtitle="Analyze search behavior and conversion funnels"
        >
            {/* Search Bar */}
            <div className="mb-6">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSearch={handleSearch}
                    placeholder="Search queries..."
                    isLoading={isSearching || searchLoading}
                    debounceMs={300}
                    className="max-w-md"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Searches"
                    value={totalSearches}
                    trend={{ value: 7.3, label: 'vs last week' }}
                    icon={<Search className="w-6 h-6" />}
                />
                <StatCard
                    title="Click-through Rate"
                    value={`${avgClickRate.toFixed(1)}%`}
                    trend={{ value: 2.1, label: 'vs last week' }}
                    icon={<TrendingUp className="w-6 h-6" />}
                />
                <StatCard
                    title="Conversion Rate"
                    value={`${avgConversionRate.toFixed(1)}%`}
                    trend={{ value: 1.5, label: 'vs last week' }}
                    icon={<BarChart3 className="w-6 h-6" />}
                />
                <StatCard
                    title="Unique Users"
                    value={userSegments?.reduce((sum, s) => sum + s.userCount, 0) || 0}
                    icon={<Users className="w-6 h-6" />}
                />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabList className="mb-6">
                    <Tab value="overview">Overview</Tab>
                    <Tab value="queries">Top Queries</Tab>
                    <Tab value="segments">User Segments</Tab>
                </TabList>

                <TabPanel value="overview">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Funnel */}
                        <ChartContainer
                            title="Conversion Funnel"
                            subtitle="Last 7 days"
                            isLoading={funnelLoading}
                        >
                            <HorizontalFunnel data={funnelChartData} />
                        </ChartContainer>

                        {/* Trend Chart */}
                        <ChartContainer
                            title="Daily Trends"
                            subtitle="Searches, clicks, and conversions"
                            isLoading={funnelLoading}
                        >
                            {funnelData && (
                                <AreaChart
                                    data={funnelData.map((d) => ({
                                        date: d.date,
                                        searches: d.searches,
                                        clicks: d.clicks,
                                        conversions: d.conversions,
                                    }))}
                                    areas={[
                                        { dataKey: 'searches', name: 'Searches', color: '#3b82f6' },
                                        { dataKey: 'clicks', name: 'Clicks', color: '#8b5cf6' },
                                        { dataKey: 'conversions', name: 'Conversions', color: '#10b981' },
                                    ]}
                                    xAxisKey="date"
                                    height={250}
                                    stacked={false}
                                />
                            )}
                        </ChartContainer>
                    </div>
                </TabPanel>

                <TabPanel value="queries">
                    <Card>
                        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">
                            Top Search Queries
                            {debouncedQuery && (
                                <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
                                    filtered by "{debouncedQuery}"
                                </span>
                            )}
                        </h3>
                        {queriesLoading || searchLoading ? (
                            <SkeletonTable rows={8} />
                        ) : (
                            <ResultsTable
                                data={debouncedQuery ? (searchResults || []) : (topQueries || [])}
                            />
                        )}
                    </Card>
                </TabPanel>

                <TabPanel value="segments">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {segmentsLoading ? (
                            [1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={3} />)
                        ) : (
                            userSegments?.map((segment) => (
                                <Card key={segment.segmentId}>
                                    <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">
                                        {segment.name}
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                                                {segment.userCount.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">Users</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                                                {segment.avgSearches.toFixed(1)}
                                            </p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">Avg Searches</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-emerald-500">
                                                {segment.conversionRate.toFixed(1)}%
                                            </p>
                                            <p className="text-xs text-[var(--color-text-secondary)]">Conversion</p>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </TabPanel>
            </Tabs>
        </MainLayout>
    );
};
