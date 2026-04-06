import type { ReactNode, CSSProperties } from 'react';

interface TextShimmerProps {
  children: ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function TextShimmer({
  children,
  className = '',
  as: Tag = 'span',
}: TextShimmerProps) {
  const style: CSSProperties = {
    backgroundImage:
      'linear-gradient(110deg, var(--text-primary) 35%, rgba(255, 255, 255, 0.6) 50%, var(--text-primary) 65%)',
    backgroundSize: '200% 100%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
    animation: 'shimmer 2s linear infinite',
  };

  return (
    <>
      <Tag className={`text-shimmer [&_*]:!text-inherit [&_*]:![color:inherit] [&_*]:![-webkit-text-fill-color:transparent] ${className}`} style={style}>
        {children}
      </Tag>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}
