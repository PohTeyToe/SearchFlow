import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { ScrollReveal } from '../motion/ScrollReveal';
import { formatRelativeTime } from '../../utils';
import type { ActivityEvent } from '../../types';

interface ActivityTimelineProps {
    events: ActivityEvent[];
}

const DOT_COLORS: Record<ActivityEvent['type'], string> = {
    search: 'var(--accent)',
    click: 'var(--success)',
    abandonment: 'var(--danger)',
    booking: 'var(--chart-3, #f59e0b)',
};

const TYPE_LABELS: Record<ActivityEvent['type'], string> = {
    search: 'Search',
    click: 'Click',
    abandonment: 'Abandonment',
    booking: 'Booking',
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events }) => {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Activity Timeline
                </h3>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    {/* Vertical connecting line */}
                    <div
                        className="absolute left-[7px] top-2 bottom-2 w-px"
                        style={{ background: 'var(--border-subtle)' }}
                    />

                    <div className="space-y-4">
                        {events.map((event, i) => (
                            <ScrollReveal key={i} delay={i * 0.04} direction="left">
                                <div className="relative flex items-start gap-3">
                                    {/* Dot */}
                                    <div
                                        className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                                        style={{
                                            borderColor: DOT_COLORS[event.type],
                                            background: DOT_COLORS[event.type],
                                            boxShadow: `0 0 6px ${DOT_COLORS[event.type]}40`,
                                        }}
                                    />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-xs font-medium uppercase tracking-wide"
                                                style={{ color: DOT_COLORS[event.type] }}
                                            >
                                                {TYPE_LABELS[event.type]}
                                            </span>
                                            <span className="text-xs text-[var(--text-muted)]">
                                                {formatRelativeTime(event.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
