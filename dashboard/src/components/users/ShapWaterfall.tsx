import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ScanLine } from '../effects/ScanLine';
import { ChevronDown } from 'lucide-react';
import type { ShapFactor } from '../../types';

interface ShapWaterfallProps {
    shapValues: ShapFactor[];
    baseValue: number;
    finalPrediction: number;
}

export const ShapWaterfall: React.FC<ShapWaterfallProps> = ({
    shapValues,
    baseValue,
    finalPrediction,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const [scanDone, setScanDone] = useState(false);
    const [showAll, setShowAll] = useState(false);

    const sorted = [...shapValues].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const maxAbsValue = Math.max(...sorted.map(s => Math.abs(s.value)), 0.01);
    const visible = showAll ? sorted : sorted.slice(0, 7);
    const hasMore = sorted.length > 7;

    return (
        <Card className="noise-overlay">
            <CardHeader>
                <div className="flex items-center justify-between w-full">
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            Why is this user at risk?
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Base: {(baseValue * 100).toFixed(0)}% &rarr; Final: {(finalPrediction * 100).toFixed(0)}%
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ background: 'rgba(16, 185, 129, 0.75)' }} />
                            Decreases risk
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded" style={{ background: 'rgba(239, 68, 68, 0.75)' }} />
                            Increases risk
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div ref={ref} className="relative">
                    <ScanLine isActive={inView && !scanDone} onComplete={() => setScanDone(true)} />

                    <div className="space-y-2">
                        {visible.map((sv, i) => {
                            const pct = (Math.abs(sv.value) / maxAbsValue) * 100;
                            const isPositive = sv.value >= 0;

                            return (
                                <div key={sv.feature} className="flex items-center gap-3 h-9">
                                    {/* Label column */}
                                    <div className="w-44 flex-shrink-0 text-right pr-2">
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            {sv.featureLabel}
                                        </span>
                                    </div>

                                    {/* Bar area - split center */}
                                    <div className="flex-1 flex items-center h-full">
                                        {/* Left half (decreases risk) */}
                                        <div className="flex-1 flex justify-end">
                                            {!isPositive && (
                                                <motion.div
                                                    className="h-6 rounded-l-md"
                                                    style={{
                                                        background: 'rgba(16, 185, 129, 0.75)',
                                                        originX: 1,
                                                    }}
                                                    initial={{ width: 0 }}
                                                    animate={scanDone ? { width: `${pct}%` } : { width: 0 }}
                                                    transition={{
                                                        delay: i * 0.06,
                                                        duration: 0.5,
                                                        type: 'spring',
                                                        stiffness: 80,
                                                        damping: 15,
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Center line */}
                                        <div className="w-px h-full bg-[var(--border-subtle)] flex-shrink-0" />

                                        {/* Right half (increases risk) */}
                                        <div className="flex-1 flex justify-start">
                                            {isPositive && (
                                                <motion.div
                                                    className="h-6 rounded-r-md"
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.75)',
                                                        originX: 0,
                                                    }}
                                                    initial={{ width: 0 }}
                                                    animate={scanDone ? { width: `${pct}%` } : { width: 0 }}
                                                    transition={{
                                                        delay: i * 0.06,
                                                        duration: 0.5,
                                                        type: 'spring',
                                                        stiffness: 80,
                                                        damping: 15,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Value annotation */}
                                    <motion.span
                                        className="w-16 flex-shrink-0 text-xs font-mono tabular-nums"
                                        style={{
                                            color: isPositive
                                                ? 'rgba(239, 68, 68, 0.9)'
                                                : 'rgba(16, 185, 129, 0.9)',
                                        }}
                                        initial={{ opacity: 0 }}
                                        animate={scanDone ? { opacity: 1 } : { opacity: 0 }}
                                        transition={{ delay: i * 0.06 + 0.4, duration: 0.3 }}
                                    >
                                        {sv.value >= 0 ? '+' : ''}{sv.value.toFixed(3)}
                                    </motion.span>
                                </div>
                            );
                        })}
                    </div>

                    {hasMore && (
                        <button
                            onClick={() => setShowAll(prev => !prev)}
                            className="mt-3 flex items-center gap-1 text-xs text-[var(--accent)] hover:underline mx-auto"
                        >
                            {showAll ? 'Show less' : `Show ${sorted.length - 7} more features`}
                            <ChevronDown
                                className="w-3 h-3 transition-transform"
                                style={{ transform: showAll ? 'rotate(180deg)' : undefined }}
                            />
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
