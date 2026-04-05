import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Clock, MousePointerClick, CalendarDays, Plane } from 'lucide-react';
import { MainLayout } from '../components/layout';
import { UserHeader } from '../components/users/UserHeader';
import { ShapWaterfall } from '../components/users/ShapWaterfall';
import { ShapExplainer } from '../components/users/ShapExplainer';
import { SearchHistory } from '../components/users/SearchHistory';
import { RecommendationsList } from '../components/users/RecommendationsList';
import { ActivityTimeline } from '../components/users/ActivityTimeline';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';
import { BlurFade } from '../components/effects/BlurFade';
import { mockApi } from '../services';
import { SkeletonCard } from '../components/ui';

interface StatCardProps {
    label: string;
    value: number;
    format?: (n: number) => string;
    icon: React.ReactNode;
    delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, format, icon, delay }) => (
    <BlurFade delay={delay}>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                {icon}
                <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
            </div>
            <AnimatedNumber
                value={value}
                format={format || ((n) => Math.round(n).toLocaleString())}
                className="text-2xl font-bold text-[var(--text-primary)]"
                duration={0.8}
            />
        </div>
    </BlurFade>
);

export const UserProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['user-profile', userId],
        queryFn: () => mockApi.getUserProfile(userId!),
        enabled: !!userId,
    });

    if (isLoading) {
        return (
            <MainLayout title="User Profile">
                <div className="space-y-6">
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={8} />
                    <SkeletonCard lines={6} />
                </div>
            </MainLayout>
        );
    }

    if (!profile) {
        return (
            <MainLayout title="User Not Found">
                <div className="text-center py-12 text-[var(--text-muted)]">
                    User {userId} not found
                </div>
            </MainLayout>
        );
    }

    // Compute stat values from profile data
    const totalSearches = profile.searchHistory.length;
    const clickedCount = profile.searchHistory.filter(s => s.clicked).length;
    const clickRate = totalSearches > 0 ? Math.round((clickedCount / totalSearches) * 100) : 0;
    const avgSession = Math.round(totalSearches * 3.2); // simulated avg session minutes
    const daysActive = Math.max(1, Math.round(
        (Date.now() - new Date(profile.lastActive).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const bookings = profile.activityEvents.filter(e => e.type === 'booking').length;

    return (
        <MainLayout
            title={profile.userId}
            subtitle={`${profile.segment.replace('_', ' ')} segment`}
        >
            <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            >
                {/* Header with RiskGauge */}
                <UserHeader user={profile} />

                {/* Stat strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <StatCard
                        label="Total Searches"
                        value={totalSearches}
                        icon={<Search className="w-3.5 h-3.5" />}
                        delay={0.05}
                    />
                    <StatCard
                        label="Avg Session"
                        value={avgSession}
                        format={(n) => `${Math.round(n)}m`}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        delay={0.1}
                    />
                    <StatCard
                        label="Click Rate"
                        value={clickRate}
                        format={(n) => `${Math.round(n)}%`}
                        icon={<MousePointerClick className="w-3.5 h-3.5" />}
                        delay={0.15}
                    />
                    <StatCard
                        label="Days Active"
                        value={daysActive}
                        icon={<CalendarDays className="w-3.5 h-3.5" />}
                        delay={0.2}
                    />
                    <StatCard
                        label="Bookings"
                        value={bookings}
                        icon={<Plane className="w-3.5 h-3.5" />}
                        delay={0.25}
                    />
                </div>

                {/* SHAP Waterfall + Explainer */}
                <div>
                    <ShapWaterfall
                        shapValues={profile.shapValues}
                        baseValue={profile.churnPrediction.baseValue}
                        finalPrediction={profile.churnPrediction.probability}
                    />
                    <ShapExplainer
                        shapValues={profile.shapValues}
                        riskLevel={profile.churnPrediction.riskLevel}
                    />
                </div>

                {/* Two-column: Search History + Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SearchHistory searches={profile.searchHistory} />
                    <RecommendationsList recommendations={profile.recommendations} />
                </div>

                {/* Activity Timeline */}
                <ActivityTimeline events={profile.activityEvents} />
            </motion.div>
        </MainLayout>
    );
};
