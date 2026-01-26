import React from 'react';
import { MainLayout } from '../components/layout';
import { DataQualityPanel } from '../components/metrics/DataQualityPanel';
import { StatCard } from '../components/metrics/StatCard';
import { RecordCountDisplay } from '../components/metrics/RecordCount';
import { ChartContainer, BarChart } from '../components/charts';
import { Card } from '../components/ui/Card';
import { useDataQualityMetrics, useRecordCounts, usePipelineMetrics, usePerformanceMetrics } from '../hooks';
import { SkeletonCard } from '../components/ui';
import { CheckCircle, XCircle, Clock, Database, Zap } from 'lucide-react';

export const MetricsPage: React.FC = () => {
    const { data: qualityMetrics, isLoading: qualityLoading } = useDataQualityMetrics();
    const { data: recordCounts, isLoading: countsLoading } = useRecordCounts();
    const { data: pipelineMetrics } = usePipelineMetrics();
    const { optimizedData: perfData, recordCount: perfCount, stats: perfStats, isLoading: perfLoading } = usePerformanceMetrics();

    const passRate = qualityMetrics
        ? (qualityMetrics.filter((m) => m.status === 'pass').length / qualityMetrics.length) * 100
        : 0;

    const totalRecords = recordCounts?.reduce((sum, r) => sum + r.count, 0) || 0;

    return (
        <MainLayout
            title="Metrics"
            subtitle="Data quality and pipeline metrics"
        >
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Test Pass Rate"
                    value={`${passRate.toFixed(1)}%`}
                    subtitle={`${qualityMetrics?.length || 0} total tests`}
                    icon={<CheckCircle className="w-6 h-6" />}
                />
                <StatCard
                    title="Failed Tests"
                    value={qualityMetrics?.filter((m) => m.status === 'fail').length || 0}
                    icon={<XCircle className="w-6 h-6" />}
                />
                <StatCard
                    title="Avg Pipeline Duration"
                    value={pipelineMetrics ? `${pipelineMetrics.averageDuration}s` : '...'}
                    icon={<Clock className="w-6 h-6" />}
                />
                <StatCard
                    title="Total Records"
                    value={totalRecords}
                    icon={<Database className="w-6 h-6" />}
                />
            </div>



            {/* Performance Lab Section - SCENARIO MATCHING */}
            <div className="mb-6">
                <ChartContainer
                    title="System Load Analysis (High Volume)"
                    subtitle={`Visualizing ${perfCount.toLocaleString()} raw events with client-side decimation`}
                    isLoading={perfLoading}
                    action={
                        <div className="flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                            <Zap className="w-4 h-4" />
                            <span>Optimized: {perfData.length} nodes rendered</span>
                        </div>
                    }
                >
                    {perfData.length > 0 && (
                        <div className="h-[300px] w-full">
                            <BarChart
                                data={perfData}
                                bars={[
                                    { dataKey: 'value', name: 'Load Index', color: '#8b5cf6' }
                                ]}
                                xAxisKey="timestamp" // We might need to format this timestamp in the chart component
                                height={300}
                            />
                            <div className="mt-2 text-xs text-gray-500 text-center">
                                Rendering {perfCount} points as {perfData.length} buckets.
                                Max load: {perfStats?.avgLatency.toFixed(1)}ms avg.
                            </div>
                        </div>
                    )}
                </ChartContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Data Quality */}
                {qualityLoading ? (
                    <SkeletonCard lines={8} />
                ) : (
                    <DataQualityPanel metrics={qualityMetrics || []} />
                )}

                {/* Record Counts */}
                <Card>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">
                        Record Counts by Table
                    </h3>
                    {countsLoading ? (
                        <SkeletonCard lines={6} />
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {recordCounts?.map((count) => (
                                <RecordCountDisplay key={count.table} data={count} />
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Record Counts Chart */}
            <ChartContainer
                title="Records by Table"
                subtitle="Current row counts"
                isLoading={countsLoading}
            >
                {recordCounts && (
                    <BarChart
                        data={recordCounts.map((r) => ({
                            table: r.table.replace('_', ' '),
                            count: r.count,
                        }))}
                        bars={[{ dataKey: 'count', name: 'Records', color: '#3b82f6' }]}
                        xAxisKey="table"
                        layout="vertical"
                        height={400}
                    />
                )}
            </ChartContainer>
        </MainLayout >
    );
};
