import React from 'react';
import {
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from 'recharts';
import { cn } from '../../utils';

interface DataPoint {
    name: string;
    value: number;
    color?: string;
}

interface PieChartProps {
    data: DataPoint[];
    height?: number;
    className?: string;
    showLegend?: boolean;
    innerRadius?: number;
    outerRadius?: number;
    colors?: string[];
}

const DEFAULT_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
];

export const PieChart: React.FC<PieChartProps> = ({
    data,
    height = 300,
    className,
    showLegend = true,
    innerRadius = 0,
    outerRadius = 80,
    colors = DEFAULT_COLORS,
}) => {
    return (
        <div className={cn('w-full', className)} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={{ stroke: 'var(--color-text-secondary)' }}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color || colors[index % colors.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '12px',
                        }}
                        formatter={(value) => [String(value ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','), 'Count']}
                    />
                    {showLegend && (
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="circle"
                            iconSize={8}
                        />
                    )}
                </RechartsPieChart>
            </ResponsiveContainer>
        </div>
    );
};
