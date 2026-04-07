import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../utils';
import { type PerformanceRecord } from '../../services/monitoringApi';

interface Props {
  data: PerformanceRecord[];
  loading?: boolean;
}

export function PerformanceChart({ data, loading }: Props) {
  const reduced = useReducedMotion();

  if (loading) {
    return (
      <div data-testid="perf-loading" className="px-5 pb-5">
        <div className="h-[140px] flex items-end gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t bg-white/5"
              animate={reduced ? {} : { opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
              style={{ height: `${30 + Math.sin(i * 0.8) * 20 + 30}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const validData = data.filter(d => d.auc != null);

  if (data.length === 0 || validData.length === 0) {
    return (
      <div data-testid="perf-empty" className="px-5 pb-5 text-sm text-[var(--color-text-secondary)]">
        No performance data available
      </div>
    );
  }

  const maxAuc = Math.max(...validData.map(d => d.auc!));
  const minAuc = Math.min(...validData.map(d => d.auc!));
  const range = Math.max(maxAuc - minAuc, 0.02);
  const threshold = 0.83;
  const thresholdPct = ((threshold - minAuc + 0.01) / (range + 0.02)) * 100;

  return (
    <div data-testid="perf-chart" className="px-5 pb-5">
      {/* Header */}
      <motion.div
        className="flex items-baseline justify-between mb-3"
        initial={reduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">
          Model AUC-ROC
        </span>
        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
          Latest: {validData[validData.length - 1].auc!.toFixed(4)}
        </span>
      </motion.div>

      {/* Chart area */}
      <div className="relative h-[140px] flex items-end gap-1.5">
        {/* Threshold line */}
        <motion.div
          data-testid="threshold-line"
          className="absolute left-0 right-0 z-10 flex items-center"
          style={{ bottom: `${thresholdPct}%` }}
          initial={reduced ? {} : { opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.05, 0.7, 0.1, 1] }}
        >
          <div className="flex-1 border-t border-dashed border-red-500/50" />
          <span className="text-[10px] text-red-500/70 font-mono ml-2 whitespace-nowrap">
            {threshold}
          </span>
        </motion.div>

        {/* Bars */}
        {validData.map((d, i) => {
          const height = ((d.auc! - minAuc + 0.01) / (range + 0.02)) * 100;
          const passing = d.auc! >= threshold;
          return (
            <motion.div
              key={d.run_id}
              className={cn(
                'flex-1 min-w-[8px] rounded-t cursor-default relative group',
                passing ? 'bg-indigo-500' : 'bg-red-500',
              )}
              initial={reduced ? { height: `${height}%` } : { height: 0, opacity: 0 }}
              animate={{ height: `${height}%`, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: i * 0.06,
                type: 'spring',
                stiffness: 80,
                damping: 15,
              }}
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-black/90 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-1 rounded-md whitespace-nowrap border border-white/10">
                  <div className="font-semibold">{d.auc!.toFixed(4)}</div>
                  <div className="text-white/50">{new Date(d.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-2 font-mono">
        <span>{new Date(validData[0].timestamp).toLocaleDateString()}</span>
        <span>{new Date(validData[validData.length - 1].timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
