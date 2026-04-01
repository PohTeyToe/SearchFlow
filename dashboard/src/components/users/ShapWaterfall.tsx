import React from 'react';
import {
    ResponsiveContainer,
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    Cell,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardContent } from '../ui/Card';
import type { ShapFactor } from '../../types';

interface ShapWaterfallProps {
    shapValues: ShapFactor[];
    baseValue: number;
    finalPrediction: number;
}

interface TooltipProps {
    active?: boolean;
    payload?: Array<{ payload: { feature: string; label: string; rawValue: number; direction: string } }>;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs shadow-lg">
            <p className="font-medium text-[var(--color-text-primary)]">{data.label}</p>
            <p className={data.rawValue >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                {data.rawValue >= 0 ? '+' : ''}{data.rawValue.toFixed(3)} ({data.direction} risk)
            </p>
        </div>
    );
};

export const ShapWaterfall: React.FC<ShapWaterfallProps> = ({
    shapValues,
    baseValue,
    finalPrediction,
}) => {
    const sorted = [...shapValues].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const chartData = sorted.map(sv => ({
        feature: sv.feature,
        label: sv.featureLabel,
        value: sv.value,
        rawValue: sv.value,
        positive: sv.value >= 0 ? sv.value : 0,
        negative: sv.value < 0 ? sv.value : 0,
        direction: sv.direction,
    }));

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            SHAP Feature Attribution
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            How each feature contributes to this user's churn prediction
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-emerald-500/80" />
                            Decreases risk
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-red-500/80" />
                            Increases risk
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-2 px-2">
                    <span>Base value: {(baseValue * 100).toFixed(0)}%</span>
                    <span>Final prediction: {(finalPrediction * 100).toFixed(0)}%</span>
                </div>

                <div style={{ height: Math.max(300, sorted.length * 36) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 140, bottom: 5 }}
                        >
                            <XAxis
                                type="number"
                                tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                                axisLine={{ stroke: 'var(--color-border)' }}
                                tickLine={false}
                                domain={['auto', 'auto']}
                                tickFormatter={(v: number) => (v >= 0 ? '+' : '') + v.toFixed(2)}
                            />
                            <YAxis
                                type="category"
                                dataKey="label"
                                tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
                                axisLine={false}
                                tickLine={false}
                                width={135}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary)', opacity: 0.5 }} />
                            <ReferenceLine x={0} stroke="var(--color-border)" strokeWidth={1} />
                            <Bar dataKey="positive" stackId="stack" radius={[0, 4, 4, 0]} barSize={20}>
                                {chartData.map((_, i) => (
                                    <Cell key={`pos-${i}`} fill="rgba(239, 68, 68, 0.75)" />
                                ))}
                            </Bar>
                            <Bar dataKey="negative" stackId="stack" radius={[4, 0, 0, 4]} barSize={20}>
                                {chartData.map((_, i) => (
                                    <Cell key={`neg-${i}`} fill="rgba(16, 185, 129, 0.75)" />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
