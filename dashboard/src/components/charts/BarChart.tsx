import React from 'react';
import {
    ResponsiveContainer,
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { cn } from '../../utils';

interface DataPoint {
    [key: string]: string | number;
}

interface BarChartProps {
    data: DataPoint[];
    bars: {
        dataKey: string;
        name: string;
        color: string;
    }[];
    xAxisKey: string;
    height?: number;
    className?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    layout?: 'vertical' | 'horizontal';
    stacked?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
    data,
    bars,
    xAxisKey,
    height = 300,
    className,
    showGrid = true,
    showLegend = true,
    layout = 'horizontal',
    stacked = false,
}) => {
    return (
        <div className={cn('w-full', className)} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                    data={data}
                    layout={layout}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            strokeOpacity={0.5}
                        />
                    )}
                    {layout === 'horizontal' ? (
                        <>
                            <XAxis
                                dataKey={xAxisKey}
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                                axisLine={{ stroke: 'var(--color-border)' }}
                                tickLine={{ stroke: 'var(--color-border)' }}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                                axisLine={{ stroke: 'var(--color-border)' }}
                                tickLine={{ stroke: 'var(--color-border)' }}
                            />
                        </>
                    ) : (
                        <>
                            <XAxis
                                type="number"
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                                axisLine={{ stroke: 'var(--color-border)' }}
                                tickLine={{ stroke: 'var(--color-border)' }}
                            />
                            <YAxis
                                type="category"
                                dataKey={xAxisKey}
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                                axisLine={{ stroke: 'var(--color-border)' }}
                                tickLine={{ stroke: 'var(--color-border)' }}
                                width={100}
                            />
                        </>
                    )}
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                        }}
                        labelStyle={{ color: 'var(--color-text-primary)' }}
                    />
                    {showLegend && (
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="rect"
                            iconSize={12}
                        />
                    )}
                    {bars.map((bar) => (
                        <Bar
                            key={bar.dataKey}
                            dataKey={bar.dataKey}
                            name={bar.name}
                            fill={bar.color}
                            stackId={stacked ? 'stack' : undefined}
                            radius={[4, 4, 0, 0]}
                        />
                    ))}
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
};
