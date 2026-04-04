export function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(circle, oklch(1 0 0 / 0.07) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  );
}
