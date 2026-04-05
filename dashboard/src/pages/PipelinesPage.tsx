import React from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '../components/layout';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';
import { StaggerContainer, staggerItem } from '../components/motion/StaggerContainer';
import { AnimatedSparkline } from '../components/charts/AnimatedSparkline';
import { Badge } from '../components/ui';
import { usePipelineStatus, usePipelineRuns, usePipelineMetrics } from '../hooks';
import { Activity, Clock, CheckCircle, XCircle } from 'lucide-react';

export const PipelinesPage: React.FC = () => {
    const { data: dags } = usePipelineStatus();
    const { data: runs } = usePipelineRuns();
    const { data: metrics } = usePipelineMetrics();

    const successRate = metrics
        ? Math.round((metrics.successfulRuns / metrics.totalRuns) * 100)
        : 0;
    const runningCount = (dags || []).filter(d => d.lastRun?.state === 'running').length;
    const successCount = (dags || []).filter(d => d.lastRun?.state === 'success').length;
    const failedCount = (dags || []).filter(d => d.lastRun?.state === 'failed').length;

    // Build sparkline data per DAG from run history
    const dagSparklines: Record<string, number[]> = {};
    if (runs) {
        for (const dag of dags || []) {
            const dagRuns = runs
                .filter(r => r.dagId === dag.dagId)
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(-8)
                .map(r => r.duration || 0);
            dagSparklines[dag.dagId] = dagRuns.length >= 2 ? dagRuns : [30, 35, 28, 40, 32, 38, 34, 36];
        }
    }

    const dotColor = (state: string | undefined) => {
        const colors: Record<string, string> = {
            running: 'var(--accent)',
            success: 'var(--success)',
            failed: 'var(--danger)',
            queued: 'var(--warning)',
        };
        return colors[state || ''] || 'var(--text-muted)';
    };

    const statusVariant = (state: string | undefined): 'success' | 'error' | 'info' | 'warning' | 'default' => {
        const map: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
            running: 'info',
            success: 'success',
            failed: 'error',
            queued: 'warning',
        };
        return map[state || ''] || 'default';
    };

    const formatRelativeTime = (isoDate: string | undefined) => {
        if (!isoDate) return 'Never';
        const diff = Date.now() - new Date(isoDate).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <MainLayout
            title="Pipelines"
            subtitle="Airflow DAG health and run history"
        >
            <StaggerContainer
                className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[minmax(140px,auto)]"
                staggerDelay={0.08}
                initialDelay={0.1}
            >
                {/* Large card: Pipeline Health Overview (2-col span) */}
                <motion.div
                    variants={staggerItem}
                    className="md:col-span-2 lg:col-span-2 row-span-2 rounded-xl border p-6 flex flex-col"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Pipeline Health
                        </h2>
                    </div>
                    <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                        Overall success rate across all DAG runs
                    </p>

                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <AnimatedNumber
                                value={successRate}
                                format={(n) => `${Math.round(n)}%`}
                                className="text-5xl font-bold tabular-nums block"
                                duration={1.6}
                            />
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                success rate
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span
                                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                />
                                <span
                                    className="relative inline-flex rounded-full h-2.5 w-2.5"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                />
                            </span>
                            <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                {runningCount} running
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: 'var(--success)' }} />
                            <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                {successCount} success
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: 'var(--danger)' }} />
                            <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                {failedCount} failed
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Medium cards: One per DAG */}
                {(dags || []).map((dag) => {
                    const state = dag.lastRun?.state || 'pending';
                    const isRunning = state === 'running';
                    const sparkData = dagSparklines[dag.dagId] || [30, 35, 28, 40, 32, 38, 34, 36];

                    return (
                        <motion.div
                            key={dag.dagId}
                            variants={staggerItem}
                            className="md:col-span-2 rounded-xl border p-5 flex flex-col"
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                borderColor: 'var(--border-subtle)',
                            }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {/* Status dot */}
                                    <span className="relative flex h-2.5 w-2.5">
                                        {isRunning && (
                                            <span
                                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                                style={{ backgroundColor: dotColor(state) }}
                                            />
                                        )}
                                        <span
                                            className="relative inline-flex rounded-full h-2.5 w-2.5"
                                            style={{ backgroundColor: dotColor(state) }}
                                        />
                                    </span>
                                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                        {dag.dagId.replace('searchflow_', '')}
                                    </h3>
                                </div>
                                <Badge variant={statusVariant(state)} size="sm">
                                    {state}
                                </Badge>
                            </div>

                            <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                {dag.description}
                            </p>

                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                        {dag.schedule}
                                    </span>
                                </div>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {formatRelativeTime(dag.lastRun?.startDate)}
                                </span>
                            </div>

                            {/* Sparkline: recent run durations */}
                            <div className="mt-auto pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Run durations
                                    </span>
                                    <AnimatedSparkline
                                        data={sparkData}
                                        color={dotColor(state)}
                                        width={100}
                                        height={20}
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mt-3">
                                {dag.tags.map((tag) => (
                                    <Badge key={tag} variant="default" size="sm">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Small stat cards */}
                <motion.div
                    variants={staggerItem}
                    className="rounded-xl border p-5 flex flex-col justify-center"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Runs</span>
                    </div>
                    <AnimatedNumber
                        value={metrics?.totalRuns || 0}
                        className="text-2xl font-bold tabular-nums block"
                        duration={1.2}
                    />
                </motion.div>

                <motion.div
                    variants={staggerItem}
                    className="rounded-xl border p-5 flex flex-col justify-center"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Duration</span>
                    </div>
                    <AnimatedNumber
                        value={metrics?.averageDuration || 0}
                        format={(n) => `${Math.round(n)}s`}
                        className="text-2xl font-bold tabular-nums block"
                        duration={1.2}
                    />
                </motion.div>

                <motion.div
                    variants={staggerItem}
                    className="rounded-xl border p-5 flex flex-col justify-center"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Successful</span>
                    </div>
                    <AnimatedNumber
                        value={metrics?.successfulRuns || 0}
                        className="text-2xl font-bold tabular-nums block"
                        duration={1.2}
                    />
                </motion.div>

                <motion.div
                    variants={staggerItem}
                    className="rounded-xl border p-5 flex flex-col justify-center"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Failed</span>
                    </div>
                    <AnimatedNumber
                        value={metrics?.failedRuns || 0}
                        className="text-2xl font-bold tabular-nums block"
                        duration={1.2}
                    />
                </motion.div>
            </StaggerContainer>
        </MainLayout>
    );
};
