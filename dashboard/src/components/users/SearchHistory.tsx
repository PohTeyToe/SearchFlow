import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils';
import type { UserSearchEvent } from '../../types';

interface SearchHistoryProps {
    searches: UserSearchEvent[];
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({ searches }) => {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Recent Search History
                </h3>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Query</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Time</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Results</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Clicked</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Destination</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {searches.map((s, i) => (
                                <tr key={i} className="hover:bg-[var(--color-bg-tertiary)] transition-colors">
                                    <td className="px-3 py-2.5 text-sm text-[var(--color-text-primary)]">
                                        {s.query}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                                        {formatDate(s.timestamp)}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                                        {s.resultsCount}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <Badge variant={s.clicked ? 'success' : 'default'} size="sm">
                                            {s.clicked ? 'Yes' : 'No'}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-[var(--color-text-secondary)]">
                                        {s.destination || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
