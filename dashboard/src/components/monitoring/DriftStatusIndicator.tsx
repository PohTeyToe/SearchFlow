import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { cn } from '../../utils';
import { type DriftStatus } from '../../services/monitoringApi';

interface Props {
  status: DriftStatus | null;
  loading?: boolean;
  error?: string | null;
}

const statusConfig = {
  healthy: {
    color: 'bg-emerald-500',
    glow: 'shadow-emerald-500/40',
    text: 'text-emerald-400',
    label: 'No Drift',
  },
  warning: {
    color: 'bg-amber-500',
    glow: 'shadow-amber-500/40',
    text: 'text-amber-400',
    label: 'Minor Drift',
  },
  critical: {
    color: 'bg-red-500',
    glow: 'shadow-red-500/40',
    text: 'text-red-400',
    label: 'Drift Detected',
  },
} as const;

function getStatus(s: DriftStatus) {
  if (s.drift_detected) return statusConfig.critical;
  if (s.drift_score > 0.2) return statusConfig.warning;
  return statusConfig.healthy;
}

function formatRelativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DriftStatusIndicator({ status, loading, error }: Props) {
  const reduced = useReducedMotion();

  if (loading) {
    return (
      <div data-testid="drift-loading" className="p-5">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-3 h-3 rounded-full bg-slate-600"
            animate={reduced ? {} : { opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-sm text-[var(--color-text-secondary)]">Checking drift status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        data-testid="drift-error"
        className="p-5 text-red-400 text-sm"
        initial={reduced ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.05, 0.7, 0.1, 1] }}
      >
        Error: {error}
      </motion.div>
    );
  }

  if (!status) return null;

  const cfg = getStatus(status);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={cfg.label}
        data-testid="drift-status"
        className="flex items-center gap-4 p-5"
        initial={reduced ? {} : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.05, 0.7, 0.1, 1] }}
      >
        {/* Pulsing indicator dot */}
        <div className="relative">
          <motion.div
            data-testid="drift-badge"
            className={cn('w-3 h-3 rounded-full shadow-lg', cfg.color, cfg.glow)}
            animate={reduced ? {} : { scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className={cn('absolute inset-0 rounded-full opacity-30 animate-ping', cfg.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className={cn('font-semibold text-sm', cfg.text)}>{cfg.label}</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 font-mono">
            Score: {(status.drift_score * 100).toFixed(1)}%
            <span className="mx-1.5 opacity-30">|</span>
            Checked {formatRelativeTime(status.last_checked)}
          </div>
        </div>

        {/* Score bar */}
        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', cfg.color)}
            initial={reduced ? { width: `${status.drift_score * 100}%` } : { width: 0 }}
            animate={{ width: `${Math.min(status.drift_score * 100, 100)}%` }}
            transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 80, damping: 15 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
