import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../../services';
import { Activity } from 'lucide-react';

interface RealtimeEvent {
    type: string;
    message: string;
    timestamp: string;
}

function timeAgo(timestamp: string): string {
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
}

const dotColor: Record<string, string> = {
    search: 'var(--accent)',
    click: 'var(--success)',
    abandonment: 'var(--danger)',
};

export const LiveEventsFeed: React.FC = () => {
    const [displayedEvents, setDisplayedEvents] = useState<(RealtimeEvent & { _key: string })[]>([]);
    const counterRef = useRef(0);

    const { data } = useQuery({
        queryKey: ['realtimeEvents'],
        queryFn: () => mockApi.getRealtimeEvents(),
        refetchInterval: 5000,
    });

    // Accumulate events, keeping the 5 most recent
    useEffect(() => {
        if (!data || data.length === 0) return;

        setDisplayedEvents((prev) => {
            const keyed = data.map((e) => ({
                ...e,
                _key: `evt-${++counterRef.current}`,
            }));
            // newest first: new events + existing, capped at 5
            return [...keyed, ...prev].slice(0, 5);
        });
    }, [data]);

    return (
        <div
            className="rounded-xl p-5 noise-overlay"
            style={{
                background: 'rgba(26, 26, 26, 0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border-subtle)',
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                <span
                    className="text-xs font-medium tracking-[0.1em] uppercase"
                    style={{ color: 'var(--text-muted)' }}
                >
                    Live Events
                </span>
                {/* Pulsing indicator */}
                <span className="relative flex h-2 w-2 ml-auto">
                    <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: 'var(--success)' }}
                    />
                    <span
                        className="relative inline-flex rounded-full h-2 w-2"
                        style={{ backgroundColor: 'var(--success)' }}
                    />
                </span>
            </div>

            {/* Event list */}
            <div className="space-y-1 overflow-hidden">
                <AnimatePresence initial={false}>
                    {displayedEvents.map((event) => (
                        <motion.div
                            key={event._key}
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="flex items-center gap-2 py-1"
                        >
                            {/* Colored dot */}
                            <span
                                className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: dotColor[event.type] || 'var(--text-muted)' }}
                            />
                            {/* Message */}
                            <span
                                className="text-xs truncate flex-1"
                                style={{ color: 'var(--text-secondary)', fontSize: '12px' }}
                            >
                                {event.message}
                            </span>
                            {/* Timestamp */}
                            <span
                                className="text-xs flex-shrink-0 tabular-nums"
                                style={{ color: 'var(--text-muted)', fontSize: '11px' }}
                            >
                                {timeAgo(event.timestamp)}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};
