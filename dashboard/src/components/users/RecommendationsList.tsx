import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { MapPin } from 'lucide-react';
import { TiltCard } from '../effects/TiltCard';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import type { UserRecommendation } from '../../types';

interface RecommendationsListProps {
    recommendations: UserRecommendation[];
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({ recommendations }) => {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Recommended Destinations
                </h3>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                        <TiltCard key={i} tiltDeg={5}>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card-hover)] border border-[var(--border-subtle)]">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ background: 'rgba(99, 102, 241, 0.1)' }}
                                >
                                    <MapPin className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            {rec.destination}
                                        </p>
                                        <span className="text-xs font-mono ml-2" style={{ color: 'var(--accent)' }}>
                                            <AnimatedNumber
                                                value={Math.round(rec.score * 100)}
                                                format={(n) => `${Math.round(n)}%`}
                                                duration={0.8}
                                            />{' '}
                                            match
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        {rec.reason}
                                    </p>
                                </div>
                            </div>
                        </TiltCard>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
