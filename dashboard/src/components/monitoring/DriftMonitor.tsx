import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../utils';
import { Card, CardHeader } from '../ui/Card';
import { DriftStatusIndicator } from './DriftStatusIndicator';
import { PerformanceChart } from './PerformanceChart';
import { fetchDriftStatus, fetchPerformanceHistory, type DriftStatus, type PerformanceRecord } from '../../services/monitoringApi';

const featureRowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: [0.05, 0.7, 0.1, 1] as const },
  }),
};

export function DriftMonitor() {
  const [driftStatus, setDriftStatus] = useState<DriftStatus | null>(null);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [drift, perf] = await Promise.all([
        fetchDriftStatus(),
        fetchPerformanceHistory(),
      ]);
      setDriftStatus(drift);
      setPerformance(perf);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const features = driftStatus?.per_feature ? Object.entries(driftStatus.per_feature) : [];

  return (
    <motion.div
      data-testid="drift-monitor"
      initial={reduced ? {} : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.05, 0.7, 0.1, 1] }}
    >
      <Card padding="none" className="overflow-hidden">
        <CardHeader className="px-5 pt-5 mb-0">
          <div className="flex items-center gap-2">
            <span>Model Health</span>
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-white/5 px-1.5 py-0.5 rounded">
              Evidently AI
            </span>
          </div>
        </CardHeader>

        <DriftStatusIndicator status={driftStatus} loading={loading} error={error} />

        <div className="border-t border-[var(--color-border)]" />

        <PerformanceChart data={performance} loading={loading} />

        {/* Feature details expandable section */}
        {features.length > 0 && (
          <div className="border-t border-[var(--color-border)]">
            <motion.button
              onClick={() => setExpanded(!expanded)}
              className={cn(
                'w-full flex items-center justify-between px-5 py-3',
                'text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                'transition-colors duration-200',
              )}
              whileHover={reduced ? {} : { backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <span className="font-medium">
                Feature Drift Details ({features.length} features)
              </span>
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[var(--color-text-muted)]"
              >
                &#9662;
              </motion.span>
            </motion.button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.05, 0.7, 0.1, 1] }}
                  className="overflow-hidden"
                >
                  <table data-testid="feature-table" className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                        <th className="px-5 py-2 font-medium">Feature</th>
                        <th className="px-5 py-2 font-medium">Drift Score</th>
                        <th className="px-5 py-2 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.map(([name, info], i) => (
                        <motion.tr
                          key={name}
                          custom={i}
                          variants={featureRowVariants}
                          initial="hidden"
                          animate="show"
                          className="border-b border-[var(--color-border)] last:border-0"
                        >
                          <td className="px-5 py-2.5 font-mono text-[var(--color-text-primary)]">{name}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  className={cn(
                                    'h-full rounded-full',
                                    info.drifted ? 'bg-red-500' : 'bg-emerald-500',
                                  )}
                                  initial={reduced ? { width: `${info.score * 100}%` } : { width: 0 }}
                                  animate={{ width: `${Math.min(info.score * 100, 100)}%` }}
                                  transition={{ duration: 0.5, delay: i * 0.06, type: 'spring', stiffness: 80, damping: 15 }}
                                />
                              </div>
                              <span className="font-mono text-[var(--color-text-secondary)]">
                                {(info.score * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
                              info.drifted
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-emerald-500/10 text-emerald-400',
                            )}>
                              <span className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                info.drifted ? 'bg-red-500' : 'bg-emerald-500',
                              )} />
                              {info.drifted ? 'Drifted' : 'Stable'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
