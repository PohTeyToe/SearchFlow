import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '../components/layout';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';
import { StaggerContainer, staggerItem } from '../components/motion/StaggerContainer';
import { AnimatedFunnel } from '../components/charts/AnimatedFunnel';
import { ScrollReveal } from '../components/motion/ScrollReveal';
import { useSearchFunnel, useTopQueries, useUserSegments } from '../hooks';
import { Search, BarChart3, Users, Layers } from 'lucide-react';

type TabId = 'funnel' | 'queries' | 'segments';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'funnel', label: 'Funnel', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'queries', label: 'Top Queries', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'segments', label: 'Segments', icon: <Users className="w-3.5 h-3.5" /> },
];

export const SearchAnalyticsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('funnel');

    const { data: funnelData } = useSearchFunnel();
    const { data: topQueries } = useTopQueries();
    const { data: userSegments } = useUserSegments();

    // Funnel totals
    const totalSearches = funnelData?.reduce((sum, d) => sum + d.searches, 0) || 0;
    const totalClicks = funnelData?.reduce((sum, d) => sum + d.clicks, 0) || 0;
    const totalConversions = funnelData?.reduce((sum, d) => sum + d.conversions, 0) || 0;

    return (
        <MainLayout
            title="Search Analytics"
            subtitle="Understand search behavior and booking conversions"
        >
            {/* Tab bar with sliding indicator */}
            <div className="flex items-center gap-1 mb-8 p-1 rounded-lg w-fit" style={{ backgroundColor: 'var(--bg-card)' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors z-10"
                        style={{
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 rounded-md"
                                style={{
                                    backgroundColor: 'var(--bg-card-hover)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {tab.icon}
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
                {activeTab === 'funnel' && (
                    <motion.div
                        key="funnel"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                    >
                        <ScrollReveal>
                            <div
                                className="rounded-2xl p-8 noise-overlay"
                                style={{
                                    background: 'rgba(26, 26, 26, 0.6)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid var(--border-subtle)',
                                    minHeight: 520,
                                }}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div
                                        className="w-6 h-6 rounded-md flex items-center justify-center"
                                        style={{ backgroundColor: 'var(--accent-subtle)' }}
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <h2 className="text-lg font-semibold tracking-tight">
                                        Booking Funnel
                                    </h2>
                                </div>
                                <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
                                    Search to Book conversion -- last 7 days
                                </p>

                                {/* Summary stats */}
                                <div className="grid grid-cols-3 gap-4 mb-10">
                                    <div
                                        className="rounded-xl p-4 text-center"
                                        style={{
                                            backgroundColor: 'var(--bg-card-hover)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <AnimatedNumber
                                            value={totalSearches}
                                            className="text-2xl font-bold tabular-nums block"
                                            duration={1.2}
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            Total Searches
                                        </p>
                                    </div>
                                    <div
                                        className="rounded-xl p-4 text-center"
                                        style={{
                                            backgroundColor: 'var(--bg-card-hover)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <AnimatedNumber
                                            value={totalSearches > 0 ? (totalClicks / totalSearches) * 100 : 0}
                                            format={(n) => `${n.toFixed(1)}%`}
                                            className="text-2xl font-bold tabular-nums block"
                                            duration={1.2}
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            Click-Through Rate
                                        </p>
                                    </div>
                                    <div
                                        className="rounded-xl p-4 text-center"
                                        style={{
                                            backgroundColor: 'var(--bg-card-hover)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <AnimatedNumber
                                            value={totalSearches > 0 ? (totalConversions / totalSearches) * 100 : 0}
                                            format={(n) => `${n.toFixed(1)}%`}
                                            className="text-2xl font-bold tabular-nums block"
                                            duration={1.2}
                                        />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            Conversion Rate
                                        </p>
                                    </div>
                                </div>

                                <AnimatedFunnel
                                    steps={[
                                        { label: 'Searches', value: totalSearches, color: 'var(--accent)' },
                                        { label: 'Clicks', value: totalClicks, color: 'var(--chart-4, #a855f7)' },
                                        { label: 'Conversions', value: totalConversions, color: 'var(--success)' },
                                    ]}
                                />
                            </div>
                        </ScrollReveal>
                    </motion.div>
                )}

                {activeTab === 'queries' && (
                    <motion.div
                        key="queries"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                    >
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div className="px-6 py-5">
                                <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                    Top Search Queries
                                </h2>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    Ranked by search volume
                                </p>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            Query
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            Count
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            Avg Position
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                            Click Rate
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(topQueries || []).map((query, i) => (
                                        <motion.tr
                                            key={query.query}
                                            className="transition-colors"
                                            style={{ borderTop: '1px solid var(--border-subtle)' }}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                                duration: 0.3,
                                                delay: 0.1 + i * 0.05,
                                                ease: [0.05, 0.7, 0.1, 1],
                                            }}
                                            whileHover={{ backgroundColor: 'var(--bg-card-hover)' }}
                                        >
                                            <td className="px-6 py-3">
                                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {query.query}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                                    {query.count.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                                                    {query.avgPosition.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-sm tabular-nums font-medium" style={{ color: 'var(--accent)' }}>
                                                    {(query.clickRate * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'segments' && (
                    <motion.div
                        key="segments"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                    >
                        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4" staggerDelay={0.08} initialDelay={0.1}>
                            {(userSegments || []).map((segment) => (
                                <motion.div
                                    key={segment.segmentId}
                                    variants={staggerItem}
                                    className="rounded-xl border p-6"
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderColor: 'var(--border-subtle)',
                                    }}
                                >
                                    <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                        {segment.name}
                                    </h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <AnimatedNumber
                                                value={segment.userCount}
                                                className="text-2xl font-bold tabular-nums block"
                                                duration={1}
                                            />
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Users</p>
                                        </div>
                                        <div>
                                            <AnimatedNumber
                                                value={segment.avgSearches}
                                                format={(n) => n.toFixed(1)}
                                                className="text-2xl font-bold tabular-nums block"
                                                duration={1}
                                            />
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Avg Searches</p>
                                        </div>
                                        <div>
                                            <AnimatedNumber
                                                value={segment.conversionRate}
                                                format={(n) => `${n.toFixed(1)}%`}
                                                className="text-2xl font-bold tabular-nums block"
                                                duration={1}
                                            />
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Conversion</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </StaggerContainer>
                    </motion.div>
                )}
            </AnimatePresence>
        </MainLayout>
    );
};
