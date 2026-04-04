import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ScanLineProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function ScanLine({ isActive, onComplete }: ScanLineProps) {
  const reduced = useReducedMotion();

  if (!isActive || reduced) return null;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        background:
          'linear-gradient(to bottom, transparent, var(--accent), transparent)',
        boxShadow: '0 0 8px var(--accent)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
      initial={{ left: '0%' }}
      animate={{ left: '100%' }}
      transition={{ duration: 0.5, ease: 'linear' }}
      onAnimationComplete={onComplete}
    />
  );
}
