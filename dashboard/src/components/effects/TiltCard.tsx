import { useRef, useState, useCallback } from 'react';
import type { ReactNode, MouseEvent } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltDeg?: number;
}

export function TiltCard({
  children,
  className = '',
  tiltDeg = 8,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(600px) rotateY(0deg) rotateX(0deg)');

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);

      setTransform(
        `perspective(600px) rotateY(${x * tiltDeg}deg) rotateX(${-y * tiltDeg}deg)`,
      );
    },
    [tiltDeg],
  );

  const handleMouseLeave = useCallback(() => {
    setTransform('perspective(600px) rotateY(0deg) rotateX(0deg)');
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform,
        transition: 'transform 0.2s ease-out',
        willChange: 'transform',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
