import React from 'react';
import { cn, formatPercent } from '../../utils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { DataQualityMetric } from '../../types';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DataQualityPanelProps {
    metrics: DataQualityMetric[];
    className?: string;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
    metrics,
    className,
}) => {
    const passed = metrics.filter((m) => m.status === 'pass').length;
    const failed = metrics.filter((m) => m.status === 'fail').length;
    const warned = metrics.filter((m) => m.status === 'warn').length;
    const passRate = metrics.length > 0 ? (passed / metrics.length) * 100 : 0;

    const getStatusIcon = (status: DataQualityMetric['status']) => {
        switch (status) {
            case 'pass':
                return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'fail':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'warn':
                return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        }
    };

    return (
        <Card className={cn(className)}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--color-text-primary)]">Data Quality</h3>
                <Badge
                    variant={passRate >= 95 ? 'success' : passRate >= 80 ? 'warning' : 'error'}
                >
                    {formatPercent(passRate, 1)} pass rate
                </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-emerald-500">{passed}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Passed</p>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-red-500">{failed}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Failed</p>
                </div>
                <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-amber-500">{warned}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Warnings</p>
                </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                    <thead className="sticky top-0 bg-[var(--color-bg-secondary)]">
                        <tr className="text-left text-xs text-[var(--color-text-secondary)]">
                            <th className="pb-2">Test</th>
                            <th className="pb-2">Model</th>
                            <th className="pb-2 text-right">Time</th>
                            <th className="pb-2 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {metrics.slice(0, 15).map((metric) => (
                            <tr key={metric.testName} className="text-sm">
                                <td className="py-2 text-[var(--color-text-primary)] truncate max-w-[150px]" title={metric.testName}>
                                    {metric.testName.length > 25
                                        ? `${metric.testName.substring(0, 25)}...`
                                        : metric.testName}
                                </td>
                                <td className="py-2 text-[var(--color-text-secondary)]">{metric.model}</td>
                                <td className="py-2 text-right text-[var(--color-text-muted)]">
                                    {metric.executionTime.toFixed(2)}s
                                </td>
                                <td className="py-2 flex justify-center">{getStatusIcon(metric.status)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {metrics.length > 15 && (
                    <p className="text-xs text-[var(--color-text-muted)] text-center py-2">
                        +{metrics.length - 15} more tests
                    </p>
                )}
            </div>
        </Card>
    );
};
