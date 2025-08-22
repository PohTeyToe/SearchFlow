import React from 'react';
import {
    ResponsiveContainer,
    AreaChart as RechartsAreaChart,
    Area,
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

interface AreaChartProps {
    data: DataPoint[];
    areas: {
        dataKey: string;
        name: string;
        color: string;
        fillOpacity?: number;
    }[];
    xAxisKey: string;
    height?: number;
    className?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    stacked?: boolean;
}

export const AreaChart: React.FC<AreaChartProps> = ({
    data,
    areas,
    xAxisKey,
    height = 300,
    className,
    showGrid = true,
    showLegend = true,
    stacked = true,
}) => {
    return (
        <div className={cn('w-full', className)} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            strokeOpacity={0.5}
                        />
                    )}
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
                            iconType="circle"
                            iconSize={8}
                        />
                    )}
                    {areas.map((area) => (
                        <Area
                            key={area.dataKey}
                            type="monotone"
                            dataKey={area.dataKey}
                            name={area.name}
                            stroke={area.color}
                            fill={area.color}
                            fillOpacity={area.fillOpacity ?? 0.3}
                            stackId={stacked ? 'stack' : undefined}
                        />
                    ))}
                </RechartsAreaChart>
            </ResponsiveContainer>
        </div>
    );
};
