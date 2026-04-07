import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export const AnimatedDivider = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="w-full max-w-5xl mx-auto py-4">
      <motion.div
        className="h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--border-default), transparent)',
        }}
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
      />
    </div>
  );
};
