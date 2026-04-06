import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lightbulb } from 'lucide-react';
import type { ShapFactor } from '../../types';

interface ShapExplainerProps {
    shapValues: ShapFactor[];
    riskLevel: 'low' | 'medium' | 'high';
}

function formatFactorValue(factor: ShapFactor): string {
    const pct = Math.abs(Math.round(factor.value * 100));
    return `${pct}%`;
}

function generateExplanation(shapValues: ShapFactor[], riskLevel: string): string {
    const sorted = [...shapValues].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const topIncreasers = sorted.filter(s => s.direction === 'increases').slice(0, 3);
    const topDecreasers = sorted.filter(s => s.direction === 'decreases').slice(0, 3);

    const parts: string[] = [];

    // Opening sentence with risk level context
    if (riskLevel === 'high') {
        parts.push('This user is at high risk of churning. Several behavioral signals point to disengagement.');
    } else if (riskLevel === 'medium') {
        parts.push('This user shows moderate churn risk with a mix of concerning and healthy signals.');
    } else {
        parts.push('This user has a low probability of churning and appears well-engaged.');
    }

    // Detail the top risk-increasing factors with specific values
    if (topIncreasers.length > 0) {
        const factorDescriptions = topIncreasers.map((f, i) => {
            const rank = i === 0 ? '#1' : i === 1 ? '#2' : '#3';
            return `${f.featureLabel.toLowerCase()} (${f.feature}) is the ${rank} factor increasing their churn risk by ${formatFactorValue(f)}`;
        });
        parts.push(factorDescriptions.join('. ') + '.');
    }

    // Detail protective factors
    if (topDecreasers.length > 0) {
        const protectiveIntro = topIncreasers.length > 0 ? 'However, ' : '';
        const protectiveDetails = topDecreasers.map(f =>
            `their ${f.featureLabel.toLowerCase()} reduces risk by ${formatFactorValue(f)}`
        );
        if (topDecreasers.length === 1) {
            parts.push(`${protectiveIntro}${protectiveDetails[0]}, suggesting some positive engagement remains.`);
        } else {
            const last = protectiveDetails.pop();
            parts.push(`${protectiveIntro}${protectiveDetails.join(', ')} and ${last} — indicating some healthy engagement patterns.`);
        }
    }

    // Actionable recommendation based on risk level
    if (riskLevel === 'high') {
        if (topIncreasers.length > 0) {
            const topFeature = topIncreasers[0].featureLabel.toLowerCase();
            parts.push(`Recommendation: prioritize a personalized re-engagement campaign addressing their ${topFeature}. Consider targeted outreach with curated search results matching their past interests.`);
        } else {
            parts.push('Recommendation: launch a win-back campaign with personalized travel deals based on their search history.');
        }
    } else if (riskLevel === 'medium') {
        parts.push('Recommendation: monitor this user closely and consider proactive engagement such as personalized destination suggestions or loyalty incentives to prevent further decline.');
    } else {
        parts.push('No immediate action needed, but continue delivering relevant search results to maintain their satisfaction.');
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
