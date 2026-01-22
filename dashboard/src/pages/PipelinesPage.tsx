import React from 'react';
import { MainLayout } from '../components/layout';
import { DAGCard } from '../components/pipeline/DAGCard';
import { PipelineTimeline } from '../components/pipeline/PipelineTimeline';
import { usePipelineStatus, usePipelineRuns } from '../hooks';
import { SkeletonCard } from '../components/ui';
import { Card } from '../components/ui/Card';

export const PipelinesPage: React.FC = () => {
    const { data: dags, isLoading: dagsLoading } = usePipelineStatus();
    const { data: runs, isLoading: runsLoading } = usePipelineRuns();

    return (
        <MainLayout
            title="Pipelines"
            subtitle="Monitor your Airflow DAGs"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* DAG List */}
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                        All DAGs ({dags?.length || 0})
                    </h3>
                    {dagsLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <SkeletonCard key={i} lines={3} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dags?.map((dag) => (
                                <DAGCard key={dag.dagId} dag={dag} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Runs */}
                <div className="lg:col-span-1">
                    <Card>
                        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">
                            Recent Runs
                        </h3>
                        {runsLoading ? (
                            <SkeletonCard lines={8} />
                        ) : (
                            <PipelineTimeline runs={runs || []} maxItems={15} />
                        )}
                    </Card>
                </div>
            </div>
        </MainLayout>
    );
};
