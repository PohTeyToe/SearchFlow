import React from 'react';
import { MainLayout } from '../components/layout';
import { StatCard } from '../components/metrics/StatCard';
import { DataQualityPanel } from '../components/metrics/DataQualityPanel';
import { PipelineStatus } from '../components/pipeline/PipelineStatus';
import { DAGCard } from '../components/pipeline/DAGCard';
import { ChartContainer, LineChart, HorizontalFunnel } from '../components/charts';
import { usePipelineStatus, useDataQualityMetrics, useSearchFunnel } from '../hooks';
import { SkeletonCard } from '../components/ui';
import { Activity, Database, Search, TrendingUp } from 'lucide-react';

export const DashboardPage: React.FC = () => {
    const { data: dags, isLoading: dagsLoading } = usePipelineStatus();
    const { data: qualityMetrics, isLoading: metricsLoading } = useDataQualityMetrics();
    const { data: funnelData, isLoading: funnelLoading } = useSearchFunnel();

    // Calculate stats from DAGs
    const runningDags = dags?.filter((d) => d.lastRun?.state === 'running').length || 0;
    const successfulDags = dags?.filter((d) => d.lastRun?.state === 'success').length || 0;
    const failedDags = dags?.filter((d) => d.lastRun?.state === 'failed').length || 0;

    // Calculate funnel stats
    const totalSearches = funnelData?.reduce((sum, d) => sum + d.searches, 0) || 0;
    const totalClicks = funnelData?.reduce((sum, d) => sum + d.clicks, 0) || 0;
    const totalConversions = funnelData?.reduce((sum, d) => sum + d.conversions, 0) || 0;

    // Estimate revenue at risk (avg booking $450, using drop-off rate)
    const bookingRate = totalSearches > 0 ? (totalConversions / totalSearches) : 0;
    const potentialBookings = Math.round(totalSearches * 0.08); // industry avg 8% conversion
    const lostBookings = Math.max(0, potentialBookings - totalConversions);
    const revenueAtRisk = lostBookings * 450; // avg booking value

    // Prepare funnel chart data with travel-specific labels
    const funnelChartData = [
        { name: 'Searches', value: totalSearches, fill: '#3b82f6' },
        { name: 'Views', value: totalClicks, fill: '#8b5cf6' },
        { name: 'Bookings', value: totalConversions, fill: '#10b981' },
    ];

    return (
        <MainLayout
            title="Travel Booking Analytics"
            subtitle="Understand your search-to-booking funnel"
        >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Flight & Hotel Searches"
                    value={totalSearches}
                    trend={{ value: 7.3, label: 'vs last week' }}
                    icon={<Search className="w-6 h-6" />}
                />
                <StatCard
                    title="Booking Rate"
                    value={totalSearches > 0 ? `${(bookingRate * 100).toFixed(1)}%` : '0%'}
                    trend={{ value: 2.1, label: 'vs last week' }}
                    icon={<TrendingUp className="w-6 h-6" />}
                />
                <StatCard
                    title="Revenue at Risk"
                    value={`$${revenueAtRisk.toLocaleString()}`}
                    subtitle="From funnel drop-offs"
                    icon={<Database className="w-6 h-6" />}
                />
                <StatCard
                    title="Pipeline Health"
                    value={dags ? `${Math.round((successfulDags / (dags.length || 1)) * 100)}%` : '...'}
                    trend={{ value: 0, label: 'stable' }}
                    icon={<Activity className="w-6 h-6" />}
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Pipeline Status */}
                <div className="lg:col-span-1">
                    {dagsLoading ? (
                        <SkeletonCard lines={4} />
                    ) : (
                        <PipelineStatus
                            totalDags={dags?.length || 0}
                            runningDags={runningDags}
                            successfulDags={successfulDags}
                            failedDags={failedDags}
                            lastUpdated={new Date().toISOString()}
                        />
                    )}
                </div>

                {/* Booking Funnel */}
                <div className="lg:col-span-2">
                    <ChartContainer
                        title="Booking Funnel"
                        subtitle="Search → View → Book (Last 7 days)"
                        isLoading={funnelLoading}
                    >
                        <HorizontalFunnel data={funnelChartData} />
                    </ChartContainer>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* DAG Cards */}
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Pipelines</h3>
                    {dagsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3].map((i) => (
                                <SkeletonCard key={i} lines={3} />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {dags?.map((dag) => (
                                <DAGCard key={dag.dagId} dag={dag} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Data Quality */}
                <div className="lg:col-span-1">
                    {metricsLoading ? (
                        <SkeletonCard lines={6} />
                    ) : (
                        <DataQualityPanel metrics={qualityMetrics || []} />
                    )}
                </div>
            </div>

            {/* Trend Chart */}
            <ChartContainer
                title="Search & Conversion Trends"
                subtitle="Daily metrics over the last 7 days"
                isLoading={funnelLoading}
            >
                {funnelData && (
                    <LineChart
                        data={funnelData.map((d) => ({
                            date: d.date,
                            searches: d.searches,
                            clicks: d.clicks,
                            conversions: d.conversions,
                        }))}
                        lines={[
                            { dataKey: 'searches', name: 'Searches', color: '#3b82f6' },
                            { dataKey: 'clicks', name: 'Clicks', color: '#8b5cf6' },
                            { dataKey: 'conversions', name: 'Conversions', color: '#10b981' },
                        ]}
                        xAxisKey="date"
                        height={300}
                    />
                )}
            </ChartContainer>
        </MainLayout>
    );
};
