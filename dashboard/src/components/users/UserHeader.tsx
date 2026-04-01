import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ChurnBadge } from './ChurnBadge';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatRelativeTime } from '../../utils';
import type { UserProfile } from '../../types';

const SEGMENT_LABELS: Record<string, string> = {
    high_value: 'High Value',
    at_risk: 'At Risk',
    new_user: 'New User',
    regular: 'Regular',
    abandoned_search: 'Abandoned Search',
};

const SEGMENT_VARIANTS: Record<string, 'success' | 'error' | 'info' | 'default' | 'warning'> = {
    high_value: 'success',
    at_risk: 'error',
    new_user: 'info',
    regular: 'default',
    abandoned_search: 'warning',
};

interface UserHeaderProps {
    user: UserProfile;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ user }) => {
    const navigate = useNavigate();
    const pct = Math.round(user.churnPrediction.probability * 100);
    const riskColors = {
        low: 'text-emerald-500',
        medium: 'text-amber-500',
        high: 'text-red-500',
    };

    return (
        <Card>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/users')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)] font-mono">
                                {user.userId}
                            </h2>
                            <Badge variant={SEGMENT_VARIANTS[user.segment]}>
                                {SEGMENT_LABELS[user.segment]}
                            </Badge>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            Last active {formatRelativeTime(user.lastActive)}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">Churn Risk</p>
                    <p className={`text-4xl font-bold ${riskColors[user.churnPrediction.riskLevel]}`}>
                        {pct}%
                    </p>
                    <ChurnBadge probability={user.churnPrediction.probability} size="sm" />
                </div>
            </div>
        </Card>
    );
};
