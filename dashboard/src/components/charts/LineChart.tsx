import React from 'react';
import {
    ResponsiveContainer,
    LineChart as RechartsLineChart,
    Line,
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

interface LineChartProps {
    data: DataPoint[];
    lines: {
        dataKey: string;
        name: string;
        color: string;
        strokeDasharray?: string;
    }[];
    xAxisKey: string;
    height?: number;
    className?: string;
    showGrid?: boolean;
    showLegend?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
    data,
    lines,
    xAxisKey,
    height = 300,
    className,
    showGrid = true,
    showLegend = true,
}) => {
    return (
        <div className={cn('w-full', className)} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                    {lines.map((line) => (
                        <Line
                            key={line.dataKey}
                            type="monotone"
                            dataKey={line.dataKey}
                            name={line.name}
                            stroke={line.color}
                            strokeWidth={2}
                            strokeDasharray={line.strokeDasharray}
                            dot={{ r: 3, fill: line.color }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    );
};
