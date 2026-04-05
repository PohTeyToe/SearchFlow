import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { ArrowLeft } from 'lucide-react';
import { formatRelativeTime } from '../../utils';
import { RiskGauge } from '../charts/RiskGauge';
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

    return (
        <div
            className="relative rounded-xl border border-[var(--border-subtle)] p-6 noise-overlay"
            style={{
                background: 'rgba(var(--bg-card-rgb, 30, 30, 46), 0.6)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            <div className="flex items-center justify-between">
                {/* Left side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/users')}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight">
                                {user.userId}
                            </h2>
                            <Badge variant={SEGMENT_VARIANTS[user.segment]}>
                                {SEGMENT_LABELS[user.segment]}
                            </Badge>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            Last active {formatRelativeTime(user.lastActive)}
                        </p>
                    </div>
                </div>

                {/* Right side: RiskGauge */}
                <RiskGauge probability={user.churnPrediction.probability} size={140} />
            </div>
        </div>
    );
};
