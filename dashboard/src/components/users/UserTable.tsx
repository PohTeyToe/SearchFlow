import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { ChurnBadge } from './ChurnBadge';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ArrowUpDown, Search } from 'lucide-react';
import { cn, formatRelativeTime } from '../../utils';
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

export const UserTable: React.FC<UserTableProps> = ({ users }) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [segmentFilter, setSegmentFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<SortField>('churnProbability');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

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

    const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
        <th
            className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:text-[var(--color-text-primary)] select-none"
            onClick={() => handleSort(field)}
        >
            <span className="inline-flex items-center gap-1">
                {children}
                <ArrowUpDown className={cn('w-3 h-3', sortField === field ? 'text-blue-500' : 'opacity-40')} />
            </span>
        </th>
    );

    return (
        <div>
            <div className="flex gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="pl-9"
                    />
                </div>
                <Select
                    value={segmentFilter}
                    onChange={(v) => setSegmentFilter(v)}
                    options={[
                        { value: 'all', label: 'All Segments' },
                        { value: 'high_value', label: 'High Value' },
                        { value: 'at_risk', label: 'At Risk' },
                        { value: 'new_user', label: 'New User' },
                        { value: 'regular', label: 'Regular' },
                        { value: 'abandoned_search', label: 'Abandoned Search' },
                    ]}
                />
            </div>

            <Card className="overflow-hidden !p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--color-bg-tertiary)]">
                            <tr>
                                <SortHeader field="userId">User ID</SortHeader>
                                <SortHeader field="churnProbability">Churn Risk</SortHeader>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                                    Top Factor
                                </th>
                                <SortHeader field="lastActive">Last Active</SortHeader>
                                <SortHeader field="segment">Segment</SortHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filtered.map((user) => (
                                <tr
                                    key={user.userId}
                                    onClick={() => navigate(`/users/${user.userId}`)}
                                    className="cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm font-mono text-[var(--color-text-primary)]">
                                        {user.userId}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ChurnBadge probability={user.churnPrediction.probability} />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                                        {user.churnPrediction.topFactors[0]?.featureLabel || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                                        {formatRelativeTime(user.lastActive)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={SEGMENT_VARIANTS[user.segment]} size="sm">
                                            {SEGMENT_LABELS[user.segment]}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-12 text-center text-[var(--color-text-muted)]">
                        No users match your filters
                    </div>
                )}
            </Card>
        </div>
    );
};
