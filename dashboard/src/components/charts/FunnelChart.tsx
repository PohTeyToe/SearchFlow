import React from 'react';
import {
    ResponsiveContainer,
    FunnelChart as RechartsFunnelChart,
    Funnel,
    Tooltip,
    LabelList,
    Cell,
} from 'recharts';
import { cn, formatNumber, formatPercent } from '../../utils';

interface FunnelStep {
    name: string;
    value: number;
    fill?: string;
}

interface FunnelChartProps {
    data: FunnelStep[];
    height?: number;
    className?: string;
    colors?: string[];
    showLabels?: boolean;
}

const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

export const FunnelChart: React.FC<FunnelChartProps> = ({
    data,
    height = 300,
    className,
    colors = DEFAULT_COLORS,
    showLabels = true,
}) => {
    // Calculate conversion rates
    const dataWithRates = data.map((item, index) => ({
        ...item,
        fill: item.fill || colors[index % colors.length],
        conversionRate: index > 0 ? (item.value / data[index - 1].value) * 100 : 100,
    }));

    return (
        <div className={cn('w-full', className)} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsFunnelChart>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                        }}
                        formatter={(value, name, props) => {
                            const numValue = Number(value ?? 0);
                            const rate = (props?.payload as { conversionRate?: number })?.conversionRate ?? 0;
                            return [
                                `${formatNumber(numValue)} (${formatPercent(rate)} rate)`,
                                String(name),
                            ];
                        }}
                    />
                    <Funnel
                        dataKey="value"
                        data={dataWithRates}
                        isAnimationActive
                    >
                        {dataWithRates.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                        {showLabels && (
                            <LabelList
                                position="center"
                                fill="#fff"
                                stroke="none"
                                dataKey="name"
                                style={{ fontSize: 14, fontWeight: 500 }}
                            />
                        )}
                    </Funnel>
                </RechartsFunnelChart>
            </ResponsiveContainer>
        </div>
    );
};

// Alternative horizontal funnel visualization
interface HorizontalFunnelProps {
    data: FunnelStep[];
    className?: string;
    colors?: string[];
}

export const HorizontalFunnel: React.FC<HorizontalFunnelProps> = ({
    data,
    className,
    colors = DEFAULT_COLORS,
}) => {
    const maxValue = Math.max(...data.map((d) => d.value));

    return (
        <div className={cn('space-y-3', className)}>
            {data.map((step, index) => {
                const prevValue = index > 0 ? data[index - 1].value : step.value;
                const conversionRate = (step.value / prevValue) * 100;
                const widthPercent = (step.value / maxValue) * 100;

                return (
                    <div key={step.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-[var(--color-text-primary)]">{step.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[var(--color-text-secondary)]">
                                    {formatNumber(step.value)}
                                </span>
                                {index > 0 && (
                                    <span className={cn(
                                        'text-xs px-1.5 py-0.5 rounded',
                                        conversionRate >= 50 ? 'bg-emerald-500/10 text-emerald-500' :
                                            conversionRate >= 20 ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-red-500/10 text-red-500'
                                    )}>
                                        {formatPercent(conversionRate)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="h-8 bg-[var(--color-bg-tertiary)] rounded-lg overflow-hidden">
                            <div
                                className="h-full rounded-lg transition-all duration-500 ease-out"
                                style={{
                                    width: `${widthPercent}%`,
                                    backgroundColor: step.fill || colors[index % colors.length],
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
