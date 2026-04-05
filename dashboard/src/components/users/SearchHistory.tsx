import React from 'react';
import { motion } from 'framer-motion';
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
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Recent Search History
                </h3>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-subtle)]">
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Query</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Time</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Results</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Clicked</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Destination</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]">
                            {searches.map((s, i) => (
                                <motion.tr
                                    key={i}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03, duration: 0.25 }}
                                    className="transition-colors"
                                    style={{
                                        backgroundColor: !s.clicked
                                            ? 'rgba(239, 68, 68, 0.04)'
                                            : undefined,
                                    }}
                                >
                                    <td className="px-3 py-2.5 text-sm text-[var(--text-primary)] font-medium">
                                        {s.query}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">
                                        {formatDate(s.timestamp)}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)] tabular-nums">
                                        {s.resultsCount}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <Badge variant={s.clicked ? 'success' : 'error'} size="sm">
                                            {s.clicked ? 'Yes' : 'No'}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-sm text-[var(--text-secondary)]">
                                        {s.destination || '\u2014'}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
