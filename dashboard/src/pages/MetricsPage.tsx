import React from 'react';
import { MainLayout } from '../components/layout';
import { DataQualityPanel } from '../components/metrics/DataQualityPanel';
import { StatCard } from '../components/metrics/StatCard';
import { RecordCountDisplay } from '../components/metrics/RecordCount';
import { ChartContainer, BarChart } from '../components/charts';
import { Card } from '../components/ui/Card';
import { useDataQualityMetrics, useRecordCounts, usePipelineMetrics } from '../hooks';
import { SkeletonCard } from '../components/ui';
import { CheckCircle, XCircle, Clock, Database } from 'lucide-react';

export const MetricsPage: React.FC = () => {
    const { data: qualityMetrics, isLoading: qualityLoading } = useDataQualityMetrics();
    const { data: recordCounts, isLoading: countsLoading } = useRecordCounts();
    const { data: pipelineMetrics } = usePipelineMetrics();

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
        </MainLayout>
    );
};
