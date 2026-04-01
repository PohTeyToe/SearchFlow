import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { MapPin } from 'lucide-react';
import type { UserRecommendation } from '../../types';

interface RecommendationsListProps {
    recommendations: UserRecommendation[];
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({ recommendations }) => {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Recommended Destinations
                </h3>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-tertiary)]"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <MapPin className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                        {rec.destination}
                                    </p>
                                    <span className="text-xs font-mono text-blue-500 ml-2">
                                        {(rec.score * 100).toFixed(0)}% match
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                    {rec.reason}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
