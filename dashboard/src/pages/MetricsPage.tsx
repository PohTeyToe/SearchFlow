import React from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '../components/layout';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';
import { StaggerContainer, staggerItem } from '../components/motion/StaggerContainer';
import { Badge } from '../components/ui';
import { useDataQualityMetrics, useRecordCounts } from '../hooks';
import { CheckCircle, XCircle, AlertTriangle, Database, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { DataQualityMetric } from '../types';

export const MetricsPage: React.FC = () => {
    const { data: qualityMetrics, isLoading: qualityLoading } = useDataQualityMetrics();
    const { data: recordCounts, isLoading: countsLoading } = useRecordCounts();

    const totalTests = qualityMetrics?.length || 0;
    const passCount = qualityMetrics?.filter((m) => m.status === 'pass').length || 0;
    const passRate = totalTests > 0 ? (passCount / totalTests) * 100 : 0;
    const totalRecords = recordCounts?.reduce((sum, r) => sum + r.count, 0) || 0;

    const statusVariant = (status: DataQualityMetric['status']): 'success' | 'error' | 'warning' => {
        if (status === 'pass') return 'success';
        if (status === 'fail') return 'error';
        return 'warning';
    };

    const statusIcon = (status: DataQualityMetric['status']) => {
        if (status === 'pass') return <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />;
        if (status === 'fail') return <XCircle className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />;
        return <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />;
    };

    return (
        <MainLayout
            title="Data Quality & Metrics"
            subtitle="Test results, record counts, and pipeline health"
        >
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1] }}
            >
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* Total Tests */}
                    <div
                        className="rounded-xl p-5"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: 'var(--accent-subtle)' }}
                            >
                                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Total Tests
                            </span>
                        </div>
                        <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            {totalTests}
                        </span>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {passCount} passing
                        </p>
                    </div>

                    {/* Pass Rate */}
                    <div
                        className="rounded-xl p-5"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: passRate >= 90 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}
                            >
                                {passRate >= 90
                                    ? <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                                    : <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                                }
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Pass Rate
                            </span>
                        </div>
                        <AnimatedNumber
                            value={passRate}
                            format={(n) => `${n.toFixed(1)}%`}
                            className="text-3xl font-bold tabular-nums block"
                            duration={1.2}
                        />
                    </div>

                    {/* Record Count */}
                    <div
                        className="rounded-xl p-5"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: 'var(--accent-subtle)' }}
                            >
                                <Database className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Record Count
                            </span>
                        </div>
                        <AnimatedNumber
                            value={totalRecords}
                            className="text-3xl font-bold tabular-nums block"
                            duration={1.2}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            across {recordCounts?.length || 0} tables
                        </p>
                    </div>
                </div>

                {/* Data Quality Table */}
                <div
                    className="rounded-2xl overflow-hidden mb-8"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    <div className="px-6 py-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                Data Quality Tests
                            </h2>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                dbt test results from latest run
                            </p>
                        </div>
                        <Badge variant={passRate >= 95 ? 'success' : passRate >= 80 ? 'warning' : 'error'}>
                            {passRate.toFixed(0)}% pass rate
                        </Badge>
                    </div>

                    {qualityLoading ? (
                        <div className="px-6 pb-6">
                            <div className="animate-pulse space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-10 rounded-lg" style={{ backgroundColor: 'var(--bg-card-hover)' }} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Test
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Model
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Time
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(qualityMetrics || []).map((metric, i) => (
                                    <motion.tr
                                        key={metric.testName}
                                        className="transition-colors"
                                        style={{ borderTop: '1px solid var(--border-subtle)' }}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{
                                            duration: 0.25,
                                            delay: i * 0.02,
                                            ease: [0.05, 0.7, 0.1, 1],
                                        }}
                                        whileHover={{ backgroundColor: 'var(--bg-card-hover)' }}
                                    >
                                        <td className="px-6 py-3">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {metric.testName.length > 30
                                                    ? `${metric.testName.substring(0, 30)}...`
                                                    : metric.testName}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {metric.model}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span className="text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                                {metric.executionTime.toFixed(2)}s
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex justify-center">
                                                <Badge variant={statusVariant(metric.status)} size="sm">
                                                    <span className="flex items-center gap-1">
                                                        {statusIcon(metric.status)}
                                                        {metric.status}
                                                    </span>
                                                </Badge>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Record Counts */}
                <div className="mb-2">
                    <h2 className="text-lg font-semibold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                        Record Counts
                    </h2>
                    <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                        Row counts per table with change since last sync
                    </p>
                </div>

                {countsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="animate-pulse h-24 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                        ))}
                    </div>
                ) : (
                    <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.04} initialDelay={0.1}>
                        {(recordCounts || []).map((rc) => (
                            <motion.div
                                key={rc.table}
                                variants={staggerItem}
                                className="rounded-xl p-5 transition-colors"
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                                whileHover={{
                                    backgroundColor: 'var(--bg-card-hover)',
                                    borderColor: 'var(--border-hover)',
                                }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Database className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                        {rc.table}
                                    </span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <AnimatedNumber
                                        value={rc.count}
                                        className="text-2xl font-bold tabular-nums block"
                                        duration={1}
                                    />
                                    <div className="flex items-center gap-1">
                                        {rc.deltaPercent > 0 ? (
                                            <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                                        ) : rc.deltaPercent < 0 ? (
                                            <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                                        ) : (
                                            <Minus className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                                        )}
                                        <span
                                            className="text-xs font-medium tabular-nums"
                                            style={{
                                                color: rc.deltaPercent > 0
                                                    ? 'var(--success)'
                                                    : rc.deltaPercent < 0
                                                        ? 'var(--danger)'
                                                        : 'var(--text-muted)',
                                            }}
                                        >
                                            {rc.deltaPercent > 0 ? '+' : ''}{rc.deltaPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </StaggerContainer>
                )}
            </motion.div>
        </MainLayout>
    );
};
