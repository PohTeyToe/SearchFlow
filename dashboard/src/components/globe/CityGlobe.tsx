import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import type { Marker } from 'cobe';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const MARKERS: Marker[] = [
  { location: [40.71, -74.01], size: 0.06 },   // NYC
  { location: [21.16, -86.85], size: 0.05 },   // Cancun
  { location: [35.68, 139.69], size: 0.06 },   // Tokyo
  { location: [-8.65, 115.22], size: 0.04 },   // Bali
  { location: [41.39, 2.17], size: 0.05 },     // Barcelona
  { location: [38.72, -9.14], size: 0.04 },    // Lisbon
  { location: [51.51, -0.13], size: 0.06 },    // London
  { location: [48.86, 2.35], size: 0.05 },     // Paris
  { location: [43.65, -79.38], size: 0.06 },   // Toronto
  { location: [36.39, 25.46], size: 0.04 },    // Santorini
];

interface CityGlobeProps {
  size?: number;
  className?: string;
}

export default function CityGlobe({ size = 500, className }: CityGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const pointerDown = useRef(false);
  const pointerX = useRef(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 2,
      baseColor: [0.15, 0.15, 0.2],
      markerColor: [0.4, 0.4, 1],
      glowColor: [0.1, 0.1, 0.3],
      markers: MARKERS,
    });

    function animate() {
      if (!pointerDown.current && !reducedMotion) {
        phiRef.current += 0.003;
      }
      globe.update({ phi: phiRef.current });
      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      globe.destroy();
    };
  }, [size, reducedMotion]);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDown.current = true;
    pointerX.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerDown.current) return;
    const delta = e.clientX - pointerX.current;
    pointerX.current = e.clientX;
    phiRef.current += delta * 0.005;
  };

  const handlePointerUp = () => {
    pointerDown.current = false;
  };

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        maxWidth: '100%',
        aspectRatio: '1',
      }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
        style={{
          width: '100%',
          height: '100%',
          contain: 'layout paint size',
          cursor: 'grab',
        }}
      />
    </div>
  );
}
