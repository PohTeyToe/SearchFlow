import type { ReactNode, CSSProperties } from 'react';

interface GradientBorderProps {
  children: ReactNode;
  className?: string;
}

export function GradientBorder({
  children,
  className = '',
}: GradientBorderProps) {
  const style: CSSProperties & Record<string, string> = {
    position: 'relative',
    borderRadius: 'inherit',
  };

  return (
    <div className={`gradient-border-wrapper ${className}`} style={style}>
      {children}
      <div className="gradient-border-effect" aria-hidden="true" />
      <style>{`
        .gradient-border-wrapper {
          position: relative;
          overflow: hidden;
        }
        @property --grad-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .gradient-border-effect {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: conic-gradient(
            from var(--grad-angle),
            var(--accent),
            var(--success),
            var(--chart-4),
            var(--accent)
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
          animation: grad-rotate 4s linear infinite;
        }
        @keyframes grad-rotate {
          to { --grad-angle: 360deg; }
        }
      `}</style>
    </div>
  );
}
