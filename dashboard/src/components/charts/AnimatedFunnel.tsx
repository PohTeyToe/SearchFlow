import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface AnimatedFunnelProps {
  steps: FunnelStep[];
  className?: string;
}

export function AnimatedFunnel({ steps, className }: AnimatedFunnelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reducedMotion = useReducedMotion();

  const maxValue = Math.max(...steps.map((s) => s.value));

  return (
    <div ref={ref} className={className} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {steps.map((step, i) => {
        const pct = (step.value / maxValue) * 100;
        const dropOff =
          i > 0
            ? ((steps[i - 1].value - step.value) / steps[i - 1].value) * 100
            : null;

        return (
          <div key={step.label}>
            {/* Drop-off annotation */}
            {dropOff !== null && (
              <div
                style={{
                  textAlign: 'right',
                  paddingLeft: '24ch',
                  fontSize: 11,
                  color: 'var(--danger)',
                  marginBottom: 2,
                }}
              >
                {Math.round(dropOff)}% drop-off
              </div>
            )}

            {/* Step row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Label */}
              <span
                style={{
                  width: '24ch',
                  textAlign: 'right',
                  flexShrink: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {step.label}
              </span>

              {/* Bar */}
              <div style={{ flex: 1, height: 24, borderRadius: 4, overflow: 'hidden', background: 'var(--border-subtle)' }}>
                <motion.div
                  style={{
                    height: '100%',
                    borderRadius: 4,
                    backgroundColor: step.color,
                  }}
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${pct}%` } : { width: 0 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { duration: 0.6, delay: i * 0.15, ease: [0.2, 0, 0, 1] }
                  }
                />
              </div>

              {/* Value */}
              <AnimatedNumber
                value={step.value}
                className="text-sm font-medium"
                duration={0.8}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
