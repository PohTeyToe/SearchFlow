import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface RiskGaugeProps {
  probability: number;
  size?: number;
}

function getRiskLevel(p: number) {
  if (p < 0.3) return { label: 'Low Risk', color: 'var(--success)' };
  if (p <= 0.7) return { label: 'Medium Risk', color: 'var(--warning)' };
  return { label: 'High Risk', color: 'var(--danger)' };
}

function describeArc(cx: number, cy: number, r: number): string {
  // Semi-circle from 180° (left) to 0° (right)
  const startX = cx - r;
  const startY = cy;
  const endX = cx + r;
  const endY = cy;
  return `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;
}

export function RiskGauge({ probability, size = 180 }: RiskGaugeProps) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const reducedMotion = useReducedMotion();

  const { label, color } = getRiskLevel(probability);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 20) / 2; // leave room for stroke
  const arcPath = describeArc(cx, cy, r);

  const viewHeight = size / 2 + 16; // half circle + some padding below

  return (
    <div style={{ width: size, textAlign: 'center', position: 'relative' }}>
      <svg
        ref={ref}
        width={size}
        height={viewHeight}
        viewBox={`0 0 ${size} ${viewHeight}`}
      >
        <defs>
          <filter id={`glow-${label.replace(/\s/g, '')}`}>
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Foreground arc */}
        <motion.path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          filter={`url(#glow-${label.replace(/\s/g, '')})`}
          initial={{ pathLength: 0 }}
          animate={
            inView
              ? { pathLength: reducedMotion ? probability : probability }
              : { pathLength: 0 }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: 1.2, ease: [0.05, 0.7, 0.1, 1] }
          }
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <AnimatedNumber
          value={Math.round(probability * 100)}
          format={(n) => `${Math.round(n)}%`}
          className="text-2xl font-bold"
          duration={1.2}
        />
        <span style={{ color, fontSize: 12, fontWeight: 600 }}>{label}</span>
      </div>
    </div>
  );
}
