import type { ReactNode, CSSProperties } from 'react';

interface BorderBeamProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  size?: number;
  color?: string;
}

export function BorderBeam({
  children,
  className = '',
  duration = 3,
  size = 150,
  color = 'oklch(0.65 0.25 270)',
}: BorderBeamProps) {
  const style: CSSProperties & Record<string, string | number> = {
    '--beam-duration': `${duration}s`,
    '--beam-size': `${size}px`,
    '--beam-color': color,
    position: 'relative',
    borderRadius: 'inherit',
  };

  return (
    <div className={`border-beam-wrapper ${className}`} style={style}>
      {children}
      <div className="border-beam-effect" aria-hidden="true" />
      <style>{`
        .border-beam-wrapper {
          position: relative;
          overflow: hidden;
        }
        @property --beam-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .border-beam-effect {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: conic-gradient(
            from var(--beam-angle),
            transparent 0%,
            transparent 70%,
            var(--beam-color, oklch(0.65 0.25 270)) 85%,
            transparent 100%
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          animation: beam-rotate var(--beam-duration, 3s) linear infinite;
        }
        @keyframes beam-rotate {
          to { --beam-angle: 360deg; }
        }
      `}</style>
    </div>
  );
}
