import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lightbulb } from 'lucide-react';
import type { ShapFactor } from '../../types';

interface ShapExplainerProps {
    shapValues: ShapFactor[];
    riskLevel: 'low' | 'medium' | 'high';
}

function generateExplanation(shapValues: ShapFactor[], riskLevel: string): string {
    const sorted = [...shapValues].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const topIncreasers = sorted.filter(s => s.direction === 'increases').slice(0, 2);
    const topDecreasers = sorted.filter(s => s.direction === 'decreases').slice(0, 2);

    const parts: string[] = [];

    if (riskLevel === 'high') {
        parts.push('This user is at high risk of churning.');
    } else if (riskLevel === 'medium') {
        parts.push('This user shows moderate churn risk.');
    } else {
        parts.push('This user has a low probability of churning.');
    }

    if (topIncreasers.length > 0) {
        const labels = topIncreasers.map(f => f.featureLabel.toLowerCase());
        parts.push(
            `The biggest risk drivers are ${labels.join(' and ')}, which push the churn probability higher.`
        );
    }

    if (topDecreasers.length > 0) {
        const labels = topDecreasers.map(f => f.featureLabel.toLowerCase());
        parts.push(
            `On the positive side, ${labels.join(' and ')} help reduce their risk.`
        );
    }

    if (riskLevel === 'high') {
        parts.push(
            'Consider a personalized re-engagement campaign targeting their search interests to prevent churn.'
        );
    }

    return parts.join(' ');
}

export const ShapExplainer: React.FC<ShapExplainerProps> = ({ shapValues, riskLevel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const explanation = generateExplanation(shapValues, riskLevel);

    return (
        <div className="mt-2">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-2 text-sm text-[var(--accent)] hover:underline transition-colors"
            >
                <Lightbulb className="w-4 h-4" />
                What does this mean?
                <ChevronDown
                    className="w-3.5 h-3.5 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] leading-relaxed">
                            {explanation}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
