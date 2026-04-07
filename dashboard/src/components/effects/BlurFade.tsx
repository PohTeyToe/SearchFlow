import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BlurFadeProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  /** When true, animation triggers on scroll into view instead of on mount */
  inView?: boolean;
}

export function BlurFade({
  children,
  delay = 0,
  duration = 0.4,
  className = '',
  inView: useInViewMode = false,
}: BlurFadeProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  const shouldAnimate = useInViewMode ? isInView : true;

  return (
    <motion.div
      ref={useInViewMode ? ref : undefined}
      className={className}
      initial={{ opacity: 0, filter: 'blur(10px)', y: 8 }}
      animate={shouldAnimate ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, filter: 'blur(10px)', y: 8 }}
      transition={{ delay, duration, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
