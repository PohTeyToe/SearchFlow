import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../components/layout';
import { ParticleField } from '../components/effects/ParticleField';
import { TextShimmer } from '../components/effects/TextShimmer';
import { BorderBeam } from '../components/effects/BorderBeam';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';
import { StaggerContainer, staggerItem } from '../components/motion/StaggerContainer';
import { ScrollReveal } from '../components/motion/ScrollReveal';
import { AnimatedFunnel } from '../components/charts/AnimatedFunnel';
import { AnimatedSparkline } from '../components/charts/AnimatedSparkline';
import CityGlobe from '../components/globe/CityGlobe';
import { Badge } from '../components/ui';
import { ChurnBadge } from '../components/users/ChurnBadge';
import { usePipelineStatus, useSearchFunnel } from '../hooks';
import { mockApi } from '../services';
import {
    Search,
    TrendingUp,
    AlertTriangle,
    ArrowRight,
    Globe,
    Activity,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
    const { data: dags } = usePipelineStatus();
    const { data: funnelData } = useSearchFunnel();
    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => mockApi.getUsers(),
    });

    // Stats
    const totalSearches = funnelData?.reduce((sum, d) => sum + d.searches, 0) || 0;
    const totalClicks = funnelData?.reduce((sum, d) => sum + d.clicks, 0) || 0;
    const totalConversions = funnelData?.reduce((sum, d) => sum + d.conversions, 0) || 0;
    const bookingRate = totalSearches > 0 ? (totalConversions / totalSearches) : 0;
    const potentialBookings = Math.round(totalSearches * 0.08);
    const lostBookings = Math.max(0, potentialBookings - totalConversions);
    const revenueAtRisk = lostBookings * 450;

    const atRiskUsers = (users || [])
        .filter(u => u.churnPrediction.riskLevel === 'high')
        .sort((a, b) => b.churnPrediction.probability - a.churnPrediction.probability)
        .slice(0, 5);

    const atRiskCount = users?.filter(u => u.churnPrediction.riskLevel === 'high').length || 0;

    // Sparkline mock data (7-day trends)
    const searchTrend = funnelData?.map(d => d.searches) || [800, 900, 850, 1000, 950, 1100, 1050];
    const conversionTrend = funnelData?.map(d => d.conversionRate) || [3.2, 3.5, 3.1, 3.8, 3.6, 4.1, 3.9];

    // Segment labels
    const segmentLabels: Record<string, string> = {
        high_value: 'High Value', at_risk: 'At Risk', new_user: 'New User',
        regular: 'Regular', abandoned_search: 'Abandoned',
    };
    const segmentVariants: Record<string, 'success' | 'error' | 'info' | 'default' | 'warning'> = {
        high_value: 'success', at_risk: 'error', new_user: 'info',
        regular: 'default', abandoned_search: 'warning',
    };

    return (
        <MainLayout fullWidth>
            {/* ═══════════════════════════════════════════
                SECTION 1 — HERO: REVENUE AT RISK
            ═══════════════════════════════════════════ */}
            <section className="relative min-h-[520px] flex flex-col items-center justify-center px-6 overflow-hidden">
                {/* Particle background */}
                <ParticleField
                    particleCount={60}
                    colors={['#10b981', '#f59e0b', '#ef4444', '#6366f1']}
                />

                {/* Radial gradient overlay for depth */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, transparent 0%, var(--bg-canvas) 100%)',
                    }}
                />

                {/* Hero content */}
                <div className="relative z-10 text-center max-w-2xl mx-auto">
                    {/* Eyebrow */}
                    <motion.p
                        className="text-xs font-medium tracking-[0.15em] uppercase mb-6"
                        style={{ color: 'var(--text-muted)' }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5, ease: [0.05, 0.7, 0.1, 1] }}
                    >
                        Travel Booking Intelligence
                    </motion.p>

                    {/* Hero number */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.6, ease: [0.05, 0.7, 0.1, 1] }}
                    >
                        <TextShimmer className="text-5xl md:text-6xl font-bold tracking-tight" as="h1">
                            <AnimatedNumber
                                value={revenueAtRisk}
                                format={(n) => `$${Math.round(n).toLocaleString()}`}
                                duration={1.8}
                            />
                        </TextShimmer>
                        <p className="text-lg mt-2" style={{ color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
                            revenue at risk
                        </p>
                    </motion.div>

                    {/* Subtitle */}
                    <motion.p
                        className="text-sm mt-4 max-w-md mx-auto"
                        style={{ color: 'var(--text-muted)' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                    >
                        from {lostBookings.toLocaleString()} abandoned searches this week — travelers who searched but never booked
                    </motion.p>
                </div>

                {/* KPI Cards */}
                <StaggerContainer
                    className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 w-full max-w-4xl mx-auto"
                    staggerDelay={0.12}
                    initialDelay={0.8}
                >
                    {/* Searches */}
                    <motion.div variants={staggerItem}>
                        <BorderBeam duration={4}>
                            <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)' }}>
                                        <Search className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <AnimatedSparkline data={searchTrend} color="var(--accent)" />
                                </div>
                                <AnimatedNumber
                                    value={totalSearches}
                                    className="text-2xl font-bold tabular-nums block"
                                    duration={1.4}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    flight & hotel searches
                                </p>
                            </div>
                        </BorderBeam>
                    </motion.div>

                    {/* Conversion Rate */}
                    <motion.div variants={staggerItem}>
                        <BorderBeam duration={4.5}>
                            <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                        <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                    </div>
                                    <AnimatedSparkline data={conversionTrend} color="var(--success)" />
                                </div>
                                <AnimatedNumber
                                    value={bookingRate * 100}
                                    format={(n) => `${n.toFixed(1)}%`}
                                    className="text-2xl font-bold tabular-nums block"
                                    duration={1.4}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    booking conversion rate
                                </p>
                            </div>
                        </BorderBeam>
                    </motion.div>

                    {/* Users at Risk */}
                    <motion.div variants={staggerItem}>
                        <Link to="/users?sort=churn_desc" className="block">
                            <BorderBeam duration={3.5} color="#ef4444">
                                <div className="p-5 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--danger-glow)' }}>
                                            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                                        </div>
                                        {/* Pulsing red dot */}
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--danger)' }} />
                                            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: 'var(--danger)' }} />
                                        </span>
                                    </div>
                                    <AnimatedNumber
                                        value={atRiskCount}
                                        className="text-2xl font-bold tabular-nums block"
                                        duration={1.4}
                                    />
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        users at high churn risk
                                    </p>
                                </div>
                            </BorderBeam>
                        </Link>
                    </motion.div>
                </StaggerContainer>
            </section>

            {/* Divider */}
            <div className="w-full h-px mx-auto max-w-5xl" style={{ background: 'linear-gradient(90deg, transparent, var(--border-default), transparent)' }} />

            {/* ═══════════════════════════════════════════
                SECTION 2 — BOOKING FUNNEL
            ═══════════════════════════════════════════ */}
            <section className="px-6 py-16 max-w-5xl mx-auto">
                <ScrollReveal>
                    <div
                        className="rounded-2xl p-8 noise-overlay"
                        style={{
                            background: 'rgba(26, 26, 26, 0.6)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)' }}>
                                <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            </div>
                            <h2 className="text-lg font-semibold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
                                Booking Funnel
                            </h2>
                        </div>
                        <p className="text-xs mb-8" style={{ color: 'var(--text-muted)' }}>
                            Search → View → Book — last 7 days
                        </p>
                        <AnimatedFunnel
                            steps={[
                                { label: 'Searches', value: totalSearches, color: 'var(--accent)' },
                                { label: 'Detail Views', value: totalClicks, color: 'var(--chart-4)' },
                                { label: 'Bookings', value: totalConversions, color: 'var(--success)' },
                            ]}
                        />
                    </div>
                </ScrollReveal>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 3 — GLOBE: SEARCH ORIGINS
            ═══════════════════════════════════════════ */}
            <section className="px-6 py-16 max-w-5xl mx-auto">
                <ScrollReveal>
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        <div className="flex-1 text-center lg:text-left">
                            <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
                                <Globe className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                <span className="text-xs font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--text-muted)' }}>
                                    Search Origins
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.02em' }}>
                                Where travelers are searching from
                            </h2>
                            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--text-secondary)' }}>
                                Real-time search events from 10 major cities. Arcs show the most popular origin-destination pairs across your travel inventory.
                            </p>

                            {/* Top routes mini-table */}
                            <div className="mt-6 space-y-2">
                                {[
                                    { from: 'New York', to: 'Cancun', count: 340 },
                                    { from: 'London', to: 'Tokyo', count: 285 },
                                    { from: 'Toronto', to: 'Reykjavik', count: 198 },
                                ].map((route, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 text-sm px-3 py-2 rounded-lg"
                                        style={{ backgroundColor: 'var(--bg-card)' }}
                                    >
                                        <span style={{ color: 'var(--text-secondary)' }}>{route.from}</span>
                                        <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ color: 'var(--text-primary)' }}>{route.to}</span>
                                        <span className="ml-auto tabular-nums text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {route.count} searches
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-shrink-0">
                            <CityGlobe size={380} />
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* Divider */}
            <div className="w-full h-px mx-auto max-w-5xl" style={{ background: 'linear-gradient(90deg, transparent, var(--border-default), transparent)' }} />

            {/* ═══════════════════════════════════════════
                SECTION 4 — USERS AT RISK
            ═══════════════════════════════════════════ */}
            <section className="px-6 py-16 max-w-5xl mx-auto">
                <ScrollReveal>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                                <span className="text-xs font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--text-muted)' }}>
                                    Churn Risk
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                                Users at Risk
                            </h2>
                        </div>
                        <Link
                            to="/users"
                            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                            style={{ color: 'var(--accent)' }}
                        >
                            View all users
                            <motion.span
                                whileHover={{ x: 3 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <ArrowRight className="w-4 h-4" />
                            </motion.span>
                        </Link>
                    </div>
                </ScrollReveal>

                <StaggerContainer className="space-y-3" staggerDelay={0.06} initialDelay={0.2}>
                    {atRiskUsers.map((user) => (
                        <motion.div key={user.userId} variants={staggerItem}>
                            <Link to={`/users/${user.userId}`}>
                                <motion.div
                                    className="flex items-center gap-4 px-5 py-4 rounded-xl border transition-colors cursor-pointer"
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderColor: 'var(--border-subtle)',
                                    }}
                                    whileHover={{
                                        y: -2,
                                        borderColor: 'var(--border-hover)',
                                        backgroundColor: 'var(--bg-card-hover)',
                                    }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* User ID */}
                                    <span className="font-mono text-sm font-medium w-24" style={{ color: 'var(--text-primary)' }}>
                                        {user.userId}
                                    </span>

                                    {/* Churn badge */}
                                    <ChurnBadge probability={user.churnPrediction.probability} />

                                    {/* Top SHAP factor */}
                                    <span className="text-xs flex-1 hidden md:block" style={{ color: 'var(--text-secondary)' }}>
                                        {user.churnPrediction.topFactors[0]?.featureLabel}
                                    </span>

                                    {/* Segment */}
                                    <Badge variant={segmentVariants[user.segment]} size="sm">
                                        {segmentLabels[user.segment]}
                                    </Badge>

                                    <ArrowRight className="w-4 h-4 ml-2" style={{ color: 'var(--text-muted)' }} />
                                </motion.div>
                            </Link>
                        </motion.div>
                    ))}
                </StaggerContainer>
            </section>

            {/* ═══════════════════════════════════════════
                SECTION 5 — SYSTEM HEALTH BAR
            ═══════════════════════════════════════════ */}
            <section className="px-6 py-8 max-w-5xl mx-auto">
                <ScrollReveal>
                    <div
                        className="flex items-center justify-between px-5 py-3 rounded-xl"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                System Health
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Pipeline status dots */}
                            {(dags || []).map((dag) => {
                                const state = dag.lastRun?.state || 'pending';
                                const dotColors: Record<string, string> = {
                                    success: 'var(--success)',
                                    running: 'var(--accent)',
                                    failed: 'var(--danger)',
                                    queued: 'var(--warning)',
                                    pending: 'var(--text-muted)',
                                };
                                const isRunning = state === 'running';
                                return (
                                    <div key={dag.dagId} className="flex items-center gap-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                            {isRunning && (
                                                <span
                                                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                                    style={{ backgroundColor: dotColors[state] }}
                                                />
                                            )}
                                            <span
                                                className="relative inline-flex rounded-full h-2.5 w-2.5"
                                                style={{ backgroundColor: dotColors[state] }}
                                            />
                                        </span>
                                        <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
                                            {dag.dagId.replace('searchflow_', '')}
                                        </span>
                                    </div>
                                );
                            })}

                            <Link
                                to="/pipelines"
                                className="text-xs font-medium ml-2 transition-colors"
                                style={{ color: 'var(--accent)' }}
                            >
                                Details →
                            </Link>
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* Bottom spacer */}
            <div className="h-12" />
        </MainLayout>
    );
};
