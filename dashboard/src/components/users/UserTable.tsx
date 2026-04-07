import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChurnBadge } from './ChurnBadge';
import { Badge } from '../ui/Badge';
import { ArrowUpDown, Search } from 'lucide-react';
import { formatRelativeTime } from '../../utils';
import type { User, UserSegment2 } from '../../types';

interface UserTableProps {
    users: User[];
}

type SortField = 'userId' | 'churnProbability' | 'lastActive' | 'segment';
type SortDirection = 'asc' | 'desc';

const SEGMENT_LABELS: Record<UserSegment2, string> = {
    high_value: 'High Value',
    at_risk: 'At Risk',
    new_user: 'New User',
    regular: 'Regular',
    abandoned_search: 'Abandoned',
};

const SEGMENT_VARIANTS: Record<UserSegment2, 'success' | 'error' | 'info' | 'default' | 'warning'> = {
    high_value: 'success',
    at_risk: 'error',
    new_user: 'info',
    regular: 'default',
    abandoned_search: 'warning',
};

const SEGMENT_FILTERS: { value: string; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'high_value', label: 'High Value' },
    { value: 'at_risk', label: 'At Risk' },
    { value: 'new_user', label: 'New User' },
    { value: 'regular', label: 'Regular' },
    { value: 'abandoned_search', label: 'Abandoned' },
];

function getRiskColor(probability: number): string {
    if (probability < 0.3) return 'var(--success)';
    if (probability < 0.7) return 'var(--warning)';
    return 'var(--danger)';
}

function getRiskBgColor(probability: number): string {
    if (probability < 0.3) return 'rgba(16, 185, 129, 0.1)';
    if (probability < 0.7) return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
}

const HoverPreviewCard: React.FC<{ user: User; topY: number }> = ({ user, topY }) => {
    const prob = user.churnPrediction.probability;
    const topFactors = user.churnPrediction.topFactors.slice(0, 3);
    const maxAbsValue = Math.max(...topFactors.map(f => Math.abs(f.value)), 0.01);

    return (
        <motion.div
            key="preview-card"
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            style={{
                position: 'absolute',
                right: -296,
                top: topY - 80,
                width: 280,
                padding: 16,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 12,
                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                zIndex: 50,
                pointerEvents: 'none',
            }}
        >
            {/* User ID + Segment badge */}
            <div className="flex items-center justify-between mb-3">
                <span
                    className="text-sm font-mono font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {user.userId}
                </span>
                <Badge variant={SEGMENT_VARIANTS[user.segment]} size="sm">
                    {SEGMENT_LABELS[user.segment]}
                </Badge>
            </div>

            {/* Churn probability bar */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                    <span
                        className="text-xs"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Churn Probability
                    </span>
                    <span
                        className="text-xs font-semibold"
                        style={{ color: getRiskColor(prob) }}
                    >
                        {(prob * 100).toFixed(0)}%
                    </span>
                </div>
                <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: getRiskBgColor(prob) }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: `${prob * 100}%`,
                            backgroundColor: getRiskColor(prob),
                        }}
                    />
                </div>
            </div>

            {/* Top SHAP factors */}
            {topFactors.length > 0 && (
                <div className="mb-3">
                    <span
                        className="text-xs font-medium block mb-2"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Top Factors
                    </span>
                    <div className="flex flex-col gap-1.5">
                        {topFactors.map((factor) => {
                            const barWidth = (Math.abs(factor.value) / maxAbsValue) * 100;
                            const barColor = factor.direction === 'increases'
                                ? 'var(--danger)'
                                : 'var(--success)';
                            const barBg = factor.direction === 'increases'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)';

                            return (
                                <div key={factor.feature}>
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span
                                            className="text-xs truncate"
                                            style={{
                                                color: 'var(--text-secondary)',
                                                maxWidth: 180,
                                            }}
                                        >
                                            {factor.featureLabel}
                                        </span>
                                        <span
                                            className="text-xs font-mono"
                                            style={{ color: barColor }}
                                        >
                                            {factor.direction === 'increases' ? '+' : '\u2212'}
                                            {Math.abs(factor.value).toFixed(2)}
                                        </span>
                                    </div>
                                    <div
                                        className="w-full h-1 rounded-full overflow-hidden"
                                        style={{ backgroundColor: barBg }}
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${barWidth}%`,
                                                backgroundColor: barColor,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* CTA */}
            <span
                className="text-xs font-medium"
                style={{ color: 'var(--accent)' }}
            >
                Click to explore &rarr;
            </span>
        </motion.div>
    );
};

export const UserTable: React.FC<UserTableProps> = ({ users }) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [segmentFilter, setSegmentFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('churnProbability');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');
    const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
    const [hoveredRowY, setHoveredRowY] = useState(0);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const filtered = useMemo(() => {
        let result = users;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(u => u.userId.toLowerCase().includes(q));
        }
        if (segmentFilter !== 'all') {
            result = result.filter(u => u.segment === segmentFilter);
        }
        result = [...result].sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'userId':
                    cmp = a.userId.localeCompare(b.userId);
                    break;
                case 'churnProbability':
                    cmp = a.churnPrediction.probability - b.churnPrediction.probability;
                    break;
                case 'lastActive':
                    cmp = new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime();
                    break;
                case 'segment':
                    cmp = a.segment.localeCompare(b.segment);
                    break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return result;
    }, [users, search, segmentFilter, sortField, sortDir]);

    const hoveredUser = useMemo(
        () => (hoveredUserId ? filtered.find(u => u.userId === hoveredUserId) ?? null : null),
        [hoveredUserId, filtered],
    );

    const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
        <th
            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none transition-colors"
            style={{ color: sortField === field ? 'var(--text-primary)' : 'var(--text-muted)' }}
            onClick={() => handleSort(field)}
        >
            <span className="inline-flex items-center gap-1">
                {children}
                <ArrowUpDown
                    className="w-3 h-3"
                    style={{
                        color: sortField === field ? 'var(--accent)' : undefined,
                        opacity: sortField === field ? 1 : 0.4,
                    }}
                />
            </span>
        </th>
    );

    return (
        <div>
            {/* Controls: search + segment filter tabs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                {/* Search input with glowing accent border on focus */}
                <div className="relative flex-1 max-w-sm">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: 'var(--text-muted)' }}
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-all duration-200"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-subtle)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>

                {/* Animated segment filter tabs */}
                <div
                    className="flex items-center gap-1 p-1 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                >
                    {SEGMENT_FILTERS.map((seg) => (
                        <button
                            key={seg.value}
                            onClick={() => setSegmentFilter(seg.value)}
                            className="relative px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
                            style={{
                                color: segmentFilter === seg.value ? 'var(--text-primary)' : 'var(--text-muted)',
                            }}
                        >
                            {segmentFilter === seg.value && (
                                <motion.div
                                    layoutId="segment-indicator"
                                    className="absolute inset-0 rounded-md"
                                    style={{ backgroundColor: 'var(--accent-subtle)' }}
                                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                                />
                            )}
                            <span className="relative z-10">{seg.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table container */}
            <div
                ref={tableContainerRef}
                className="rounded-xl overflow-hidden"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    position: 'relative',
                }}
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr
                                style={{
                                    borderBottom: '1px solid var(--border-subtle)',
                                }}
                            >
                                <SortHeader field="userId">User ID</SortHeader>
                                <SortHeader field="churnProbability">Churn Risk</SortHeader>
                                <th
                                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Top Factor
                                </th>
                                <SortHeader field="lastActive">Last Active</SortHeader>
                                <SortHeader field="segment">Segment</SortHeader>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {filtered.map((user, index) => (
                                    <motion.tr
                                        key={user.userId}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{
                                            delay: index * 0.03,
                                            duration: 0.3,
                                            ease: [0.2, 0, 0, 1],
                                        }}
                                        whileHover={{ y: -2 }}
                                        onClick={() => navigate(`/users/${user.userId}`)}
                                        className="cursor-pointer transition-colors"
                                        style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card-hover)';
                                            setHoveredUserId(user.userId);
                                            if (tableContainerRef.current) {
                                                const rowRect = e.currentTarget.getBoundingClientRect();
                                                const containerRect = tableContainerRef.current.getBoundingClientRect();
                                                setHoveredRowY(rowRect.top - containerRect.top + rowRect.height / 2);
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                            setHoveredUserId(null);
                                        }}
                                    >
                                        <td
                                            className="px-4 py-3 text-sm font-mono"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {user.userId}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {/* Mini progress bar */}
                                                <div
                                                    className="w-16 h-1.5 rounded-full overflow-hidden flex-shrink-0"
                                                    style={{ backgroundColor: getRiskBgColor(user.churnPrediction.probability) }}
                                                >
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{ backgroundColor: getRiskColor(user.churnPrediction.probability) }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${user.churnPrediction.probability * 100}%` }}
                                                        transition={{ delay: index * 0.03 + 0.2, duration: 0.6, ease: 'easeOut' }}
                                                    />
                                                </div>
                                                <ChurnBadge probability={user.churnPrediction.probability} size="sm" />
                                            </div>
                                        </td>
                                        <td
                                            className="px-4 py-3 text-sm"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            {user.churnPrediction.topFactors[0]?.featureLabel || '\u2014'}
                                        </td>
                                        <td
                                            className="px-4 py-3 text-sm"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            {formatRelativeTime(user.lastActive)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={SEGMENT_VARIANTS[user.segment]} size="sm">
                                                {SEGMENT_LABELS[user.segment]}
                                            </Badge>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Hover preview card */}
                <AnimatePresence>
                    {hoveredUser && (
                        <HoverPreviewCard
                            user={hoveredUser}
                            topY={hoveredRowY}
                        />
                    )}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <div
                        className="py-12 text-center text-sm"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        No users match your filters
                    </div>
                )}
            </div>
        </div>
    );
};
