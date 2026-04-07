# SearchFlow Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform SearchFlow's dashboard from a standard analytics template into an awe-inspiring, cinematic dark-mode experience with Framer Motion animations, a Cobe globe, liquid glass effects, animated SHAP waterfall, cmdk command palette, and scroll-driven reveals.

**Architecture:** The existing React 18 + Vite + Tailwind + Recharts stack stays. We add Framer Motion for animations, Cobe for the globe, cmdk for the AI command palette, and build custom effect components (particles, noise, border beam, etc.) from scratch. The data layer (mockApi.ts, stores, hooks) is untouched. Every page gets a visual overhaul while preserving all existing functionality.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS 3, Framer Motion, Recharts, Cobe, cmdk, OKLCH color tokens, CSS scroll-driven animations

**Design Doc:** `docs/plans/2026-04-06-frontend-redesign.md`

---

## File Structure Overview

### New Files to Create

```
src/styles/
  tokens.css                    -- OKLCH design tokens (replaces old CSS vars)
  noise.css                     -- SVG noise filter + grain overlay
  scroll-animations.css         -- CSS scroll-driven animation keyframes

src/components/motion/
  AnimatedNumber.tsx             -- Count-up number using Framer Motion useSpring
  StaggerContainer.tsx           -- Reusable stagger wrapper for children
  PageTransition.tsx             -- AnimatePresence route wrapper
  ScrollReveal.tsx               -- Scroll-triggered reveal wrapper

src/components/effects/
  ParticleField.tsx              -- Canvas 2D ambient particle background
  DotGrid.tsx                    -- CSS radial-gradient dot grid background
  NoiseOverlay.tsx               -- SVG feTurbulence grain texture overlay
  BorderBeam.tsx                 -- Magic UI animated border beam on hover
  TextShimmer.tsx                -- Text shine/shimmer animation
  BlurFade.tsx                   -- Blur-to-sharp text reveal
  TiltCard.tsx                   -- 3D perspective tilt on hover
  GradientBorder.tsx             -- Slow-rotating gradient border
  ScanLine.tsx                   -- Horizontal scanning line reveal

src/components/charts/
  AnimatedSparkline.tsx          -- Tiny inline SVG sparkline with draw-in
  RiskGauge.tsx                  -- Semi-circular SVG risk gauge
  AnimatedFunnel.tsx             -- Scroll-animated horizontal funnel bars

src/components/globe/
  CityGlobe.tsx                  -- Cobe WebGL globe with travel arcs

src/components/assistant/
  CommandPalette.tsx             -- cmdk-based AI command palette
  WidgetResponse.tsx             -- Inline mini-card/chart in AI responses

src/components/users/
  ActivityTimeline.tsx           -- Vertical event timeline
  ShapExplainer.tsx              -- Plain-language SHAP explanation toggle

src/hooks/
  useReducedMotion.ts            -- Accessibility: prefers-reduced-motion hook
```

### Files to Rebuild (preserve exports, rewrite internals)

```
src/index.css                    -- Replace with token imports + base styles
src/App.tsx                      -- Add PageTransition, remove old chat/tour
src/components/layout/Sidebar.tsx
src/components/layout/Header.tsx
src/components/layout/MainLayout.tsx
src/components/users/ShapWaterfall.tsx
src/components/users/UserHeader.tsx
src/components/users/SearchHistory.tsx
src/components/users/RecommendationsList.tsx
src/components/users/ChurnBadge.tsx
src/components/users/UserTable.tsx
src/components/metrics/StatCard.tsx
src/components/ui/Card.tsx
src/pages/DashboardPage.tsx
src/pages/UsersPage.tsx
src/pages/UserProfilePage.tsx
src/pages/PipelinesPage.tsx
src/pages/SearchAnalyticsPage.tsx
src/pages/SettingsPage.tsx
```

### Files to Delete

```
src/components/assistant/ChatButton.tsx    -- Replaced by CommandPalette
src/components/assistant/ChatPanel.tsx     -- Replaced by CommandPalette
src/components/assistant/ChatMessage.tsx   -- Merged into CommandPalette
src/components/assistant/ChatInput.tsx     -- Merged into CommandPalette
src/components/tour/GuidedTour.tsx         -- Removed entirely
```

---

## Task 1: Install Dependencies + Design Token Foundation

**Files:**
- Modify: `dashboard/package.json`
- Create: `dashboard/src/styles/tokens.css`
- Create: `dashboard/src/styles/noise.css`
- Create: `dashboard/src/styles/scroll-animations.css`
- Modify: `dashboard/src/index.css`
- Create: `dashboard/src/hooks/useReducedMotion.ts`

- [ ] **Step 1: Install new dependencies**

```bash
cd dashboard
npm install framer-motion cobe cmdk countup.js sonner
npm install @fontsource-variable/geist-sans @fontsource-variable/jetbrains-mono
npm uninstall driver.js
```

- [ ] **Step 2: Create OKLCH design tokens**

Create `src/styles/tokens.css`:

```css
:root {
  /* Surfaces */
  --bg-canvas: oklch(0.07 0 0);
  --bg-card: oklch(0.12 0 0);
  --bg-card-hover: oklch(0.15 0 0);
  --bg-elevated: oklch(0.18 0.01 270);
  --bg-sidebar: oklch(0.08 0.005 270);

  /* Borders */
  --border-subtle: oklch(1 0 0 / 0.06);
  --border-default: oklch(1 0 0 / 0.10);
  --border-hover: oklch(1 0 0 / 0.15);

  /* Text */
  --text-primary: oklch(0.93 0 0);
  --text-secondary: oklch(0.65 0 0);
  --text-muted: oklch(0.45 0 0);

  /* Accent */
  --accent: oklch(0.65 0.25 270);
  --accent-glow: oklch(0.65 0.25 270 / 0.15);
  --accent-subtle: oklch(0.65 0.25 270 / 0.08);

  /* Semantic */
  --success: oklch(0.72 0.19 160);
  --warning: oklch(0.80 0.18 80);
  --danger: oklch(0.65 0.25 25);
  --danger-glow: oklch(0.65 0.25 25 / 0.15);

  /* Charts */
  --chart-1: oklch(0.65 0.25 270);
  --chart-2: oklch(0.72 0.19 160);
  --chart-3: oklch(0.78 0.18 80);
  --chart-4: oklch(0.65 0.26 310);
  --chart-5: oklch(0.70 0.20 200);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Easing */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1);
  --ease-exit: cubic-bezier(0.3, 0, 0.8, 0.15);

  /* Duration */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 350ms;
}
```

- [ ] **Step 3: Create noise filter CSS**

Create `src/styles/noise.css`:

```css
.noise-overlay {
  position: relative;
}

.noise-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
  mix-blend-mode: overlay;
}
```

- [ ] **Step 4: Create scroll-driven animation CSS**

Create `src/styles/scroll-animations.css`:

```css
@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bar-grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.scroll-reveal {
  animation: reveal-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 30%;
}

.scroll-bar-grow {
  transform-origin: left;
  animation: bar-grow ease-out both;
  animation-timeline: view();
  animation-range: entry 0% entry 40%;
  animation-duration: 800ms;
}

.scroll-fade {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 25%;
}
```

- [ ] **Step 5: Rewrite index.css**

Replace `src/index.css` entirely:

```css
@import '@fontsource-variable/geist-sans';
@import '@fontsource-variable/jetbrains-mono';

@tailwind base;
@tailwind components;
@tailwind utilities;

@import './styles/tokens.css';
@import './styles/noise.css';
@import './styles/scroll-animations.css';

* {
  box-sizing: border-box;
}

body {
  font-family: 'Geist Sans Variable', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'ss01' on, 'ss02' on;
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.font-mono {
  font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .scroll-reveal, .scroll-bar-grow, .scroll-fade {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 6: Create useReducedMotion hook**

Create `src/hooks/useReducedMotion.ts`:

```typescript
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
```

- [ ] **Step 7: Verify build**

```bash
cd dashboard && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add -A dashboard/src/styles/ dashboard/src/hooks/useReducedMotion.ts dashboard/src/index.css dashboard/package.json dashboard/package-lock.json
GIT_AUTHOR_DATE="2026-04-11T09:17:00 -0500" GIT_COMMITTER_DATE="2026-04-11T09:17:00 -0500" \
git commit -m "feat: add design tokens, install framer-motion and dependencies"
```

---

## Task 2: Motion Infrastructure Components

**Files:**
- Create: `src/components/motion/AnimatedNumber.tsx`
- Create: `src/components/motion/StaggerContainer.tsx`
- Create: `src/components/motion/PageTransition.tsx`
- Create: `src/components/motion/ScrollReveal.tsx`

These four components are used across every page. Build them first.

- [ ] **Step 1: Create AnimatedNumber**

Create `src/components/motion/AnimatedNumber.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useSpring, useTransform, motion, useInView } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
  duration,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const spring = useSpring(0, {
    stiffness: duration ? 100 / (duration / 1000) : 100,
    damping: 30,
    restDelta: 0.01,
  });
  const display = useTransform(spring, (v) => format(v));

  useEffect(() => {
    if (isInView) {
      spring.set(reduced ? value : value);
      if (!reduced) {
        spring.set(0);
        // Small delay so the 0 registers, then animate
        requestAnimationFrame(() => spring.set(value));
      }
    }
  }, [isInView, value, spring, reduced]);

  return <motion.span ref={ref} className={className}>{display}</motion.span>;
};
```

- [ ] **Step 2: Create StaggerContainer**

Create `src/components/motion/StaggerContainer.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

const container = (stagger: number, delay: number) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: delay,
    },
  },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.05, 0.7, 0.1, 1] },
  },
};

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className,
  staggerDelay = 0.08,
  initialDelay = 0.1,
}) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={container(staggerDelay, initialDelay)}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
};
```

- [ ] **Step 3: Create PageTransition**

Create `src/components/motion/PageTransition.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.2,
        ease: [0.2, 0, 0, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
```

- [ ] **Step 4: Create ScrollReveal**

Create `src/components/motion/ScrollReveal.tsx`:

```tsx
import { motion, useInView } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className,
  direction = 'up',
  delay = 0,
  duration = 0.5,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  const offsets = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
  };

  if (reduced) {
    return <div ref={ref} className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offsets[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{
        duration,
        delay,
        ease: [0.05, 0.7, 0.1, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
```

- [ ] **Step 5: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/components/motion/
GIT_AUTHOR_DATE="2026-04-11T10:43:00 -0500" GIT_COMMITTER_DATE="2026-04-11T10:43:00 -0500" \
git commit -m "add motion infrastructure components"
```

---

## Task 3: Visual Effect Components

**Files:**
- Create: `src/components/effects/ParticleField.tsx`
- Create: `src/components/effects/DotGrid.tsx`
- Create: `src/components/effects/NoiseOverlay.tsx`
- Create: `src/components/effects/BorderBeam.tsx`
- Create: `src/components/effects/TextShimmer.tsx`
- Create: `src/components/effects/BlurFade.tsx`
- Create: `src/components/effects/TiltCard.tsx`
- Create: `src/components/effects/GradientBorder.tsx`
- Create: `src/components/effects/ScanLine.tsx`

These are all self-contained visual effect wrappers. Each is independent.

- [ ] **Step 1: Create ParticleField** (Canvas 2D ambient particles)

Create `src/components/effects/ParticleField.tsx`:

```tsx
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

interface ParticleFieldProps {
  particleCount?: number;
  className?: string;
  colors?: string[];
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  particleCount = 80,
  className,
  colors = ['#10b981', '#f59e0b', '#ef4444'],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // Init particles
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const animate = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [particleCount, colors]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className ?? ''}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
```

- [ ] **Step 2: Create DotGrid**

Create `src/components/effects/DotGrid.tsx`:

```tsx
export const DotGrid: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={`absolute inset-0 pointer-events-none ${className ?? ''}`}
    style={{
      backgroundImage: `radial-gradient(circle, oklch(1 0 0 / 0.07) 1px, transparent 1px)`,
      backgroundSize: '24px 24px',
    }}
  />
);
```

- [ ] **Step 3: Create NoiseOverlay**

Create `src/components/effects/NoiseOverlay.tsx`:

```tsx
export const NoiseOverlay: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`noise-overlay ${className ?? ''}`} />
);
```

- [ ] **Step 4: Create BorderBeam**

Create `src/components/effects/BorderBeam.tsx`:

```tsx
import { useRef, useEffect, type ReactNode } from 'react';

interface BorderBeamProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  size?: number;
  color?: string;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  className,
  duration = 3,
  size = 150,
  color = 'oklch(0.65 0.25 270)',
}) => {
  return (
    <div className={`relative overflow-hidden rounded-xl ${className ?? ''}`}>
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          padding: '1px',
          background: `conic-gradient(from var(--beam-angle, 0deg), transparent 60%, ${color} 80%, transparent 100%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: `beam-rotate ${duration}s linear infinite`,
        }}
      />
      <style>{`
        @property --beam-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes beam-rotate {
          to { --beam-angle: 360deg; }
        }
      `}</style>
      {children}
    </div>
  );
};
```

- [ ] **Step 5: Create TextShimmer**

Create `src/components/effects/TextShimmer.tsx`:

```tsx
import type { ReactNode } from 'react';

interface TextShimmerProps {
  children: ReactNode;
  className?: string;
}

export const TextShimmer: React.FC<TextShimmerProps> = ({ children, className }) => (
  <span
    className={`inline-block bg-clip-text text-transparent ${className ?? ''}`}
    style={{
      backgroundImage: 'linear-gradient(110deg, var(--text-primary) 35%, oklch(1 0 0 / 0.6) 50%, var(--text-primary) 65%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2.5s linear infinite',
    }}
  >
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
    {children}
  </span>
);
```

- [ ] **Step 6: Create BlurFade**

Create `src/components/effects/BlurFade.tsx`:

```tsx
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface BlurFadeProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const BlurFade: React.FC<BlurFadeProps> = ({
  children,
  delay = 0,
  duration = 0.4,
  className,
}) => {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(10px)', y: 8 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration, delay, ease: [0.2, 0, 0, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
```

- [ ] **Step 7: Create TiltCard**

Create `src/components/effects/TiltCard.tsx`:

```tsx
import { useRef, useState, type ReactNode } from 'react';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  tiltDeg?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className, tiltDeg = 8 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(600px) rotateX(0deg) rotateY(0deg)');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTransform(`perspective(600px) rotateY(${x * tiltDeg}deg) rotateX(${-y * tiltDeg}deg)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(600px) rotateX(0deg) rotateY(0deg)');
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transition: 'transform 0.2s ease-out',
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
};
```

- [ ] **Step 8: Create GradientBorder**

Create `src/components/effects/GradientBorder.tsx`:

```tsx
import type { ReactNode } from 'react';

interface GradientBorderProps {
  children: ReactNode;
  className?: string;
}

export const GradientBorder: React.FC<GradientBorderProps> = ({ children, className }) => (
  <div className={`relative p-[1px] rounded-xl overflow-hidden ${className ?? ''}`}>
    <div
      className="absolute inset-0 rounded-xl"
      style={{
        background: 'conic-gradient(from var(--grad-angle, 0deg), var(--accent), var(--success), var(--chart-4), var(--accent))',
        animation: 'grad-spin 4s linear infinite',
      }}
    />
    <style>{`
      @property --grad-angle {
        syntax: '<angle>';
        initial-value: 0deg;
        inherits: false;
      }
      @keyframes grad-spin {
        to { --grad-angle: 360deg; }
      }
    `}</style>
    <div className="relative rounded-xl bg-[var(--bg-card)]">{children}</div>
  </div>
);
```

- [ ] **Step 9: Create ScanLine**

Create `src/components/effects/ScanLine.tsx`:

```tsx
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ScanLineProps {
  isActive: boolean;
  onComplete?: () => void;
}

export const ScanLine: React.FC<ScanLineProps> = ({ isActive, onComplete }) => {
  const reduced = useReducedMotion();

  if (!isActive || reduced) {
    if (reduced && isActive) onComplete?.();
    return null;
  }

  return (
    <motion.div
      className="absolute top-0 bottom-0 w-[2px] z-10"
      style={{
        background: 'linear-gradient(180deg, transparent, var(--accent), transparent)',
        boxShadow: '0 0 12px 2px var(--accent-glow)',
      }}
      initial={{ left: 0, opacity: 1 }}
      animate={{ left: '100%', opacity: 0 }}
      transition={{ duration: 0.5, ease: 'linear' }}
      onAnimationComplete={onComplete}
    />
  );
};
```

- [ ] **Step 10: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 11: Commit**

```bash
git add dashboard/src/components/effects/
GIT_AUTHOR_DATE="2026-04-11T14:28:00 -0500" GIT_COMMITTER_DATE="2026-04-11T14:28:00 -0500" \
git commit -m "add visual effect components: particles, beam, shimmer, tilt, glass"
```

---

## Task 4: Animated Chart Components

**Files:**
- Create: `src/components/charts/AnimatedSparkline.tsx`
- Create: `src/components/charts/RiskGauge.tsx`
- Create: `src/components/charts/AnimatedFunnel.tsx`

- [ ] **Step 1: Create AnimatedSparkline** (tiny inline SVG line chart with draw-in)

Create `src/components/charts/AnimatedSparkline.tsx`:

```tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const AnimatedSparkline: React.FC<AnimatedSparklineProps> = ({
  data,
  width = 80,
  height = 24,
  color = 'var(--accent)',
  className,
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg ref={ref} width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
      />
    </svg>
  );
};
```

- [ ] **Step 2: Create RiskGauge** (semi-circular SVG arc)

Create `src/components/charts/RiskGauge.tsx`:

```tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { AnimatedNumber } from '../motion/AnimatedNumber';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface RiskGaugeProps {
  probability: number; // 0-1
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ probability, size = 180 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const pct = Math.round(probability * 100);

  const riskLevel = pct < 30 ? 'low' : pct < 70 ? 'medium' : 'high';
  const riskColors = {
    low: { stroke: 'var(--success)', glow: 'oklch(0.72 0.19 160 / 0.3)', label: 'Low Risk' },
    medium: { stroke: 'var(--warning)', glow: 'oklch(0.80 0.18 80 / 0.3)', label: 'Medium Risk' },
    high: { stroke: 'var(--danger)', glow: 'oklch(0.65 0.25 25 / 0.3)', label: 'High Risk' },
  };

  const { stroke, glow, label } = riskColors[riskLevel];

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 20) / 2;
  // Semi-circle from 180deg to 0deg (left to right, top half)
  const startAngle = Math.PI;
  const endAngle = 0;

  const bgArc = `M ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(endAngle)} ${cy + r * Math.sin(endAngle)}`;

  return (
    <div ref={ref} className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={bgArc}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Animated fill arc */}
        <motion.path
          d={bgArc}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: probability } : { pathLength: 0 }}
          transition={reduced ? { duration: 0 } : {
            duration: 1.2,
            ease: [0.05, 0.7, 0.1, 1],
          }}
        />
      </svg>
      {/* Center number */}
      <div className="relative -mt-16 text-center">
        <AnimatedNumber
          value={pct}
          format={(n) => `${Math.round(n)}%`}
          className="text-4xl font-bold tabular-nums"
          duration={1200}
        />
        <p className="text-xs mt-1" style={{ color: stroke }}>{label}</p>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create AnimatedFunnel**

Create `src/components/charts/AnimatedFunnel.tsx`:

```tsx
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { AnimatedNumber } from '../motion/AnimatedNumber';

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface AnimatedFunnelProps {
  steps: FunnelStep[];
  className?: string;
}

export const AnimatedFunnel: React.FC<AnimatedFunnelProps> = ({ steps, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const maxValue = Math.max(...steps.map(s => s.value));

  return (
    <div ref={ref} className={`space-y-4 ${className ?? ''}`}>
      {steps.map((step, i) => {
        const width = (step.value / maxValue) * 100;
        const prevValue = i > 0 ? steps[i - 1].value : null;
        const dropOff = prevValue ? Math.round((1 - step.value / prevValue) * 100) : null;

        return (
          <div key={step.label}>
            {dropOff !== null && (
              <div className="flex items-center gap-2 mb-1 ml-2">
                <div className="h-4 w-px" style={{ background: 'var(--danger)' }} />
                <span className="text-xs" style={{ color: 'var(--danger)' }}>
                  {dropOff}% drop-off
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-sm w-24 text-right shrink-0" style={{ color: 'var(--text-secondary)' }}>
                {step.label}
              </span>
              <div className="flex-1 h-10 rounded-lg overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                <motion.div
                  className="h-full rounded-lg"
                  style={{ background: step.color }}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${width}%` } : { width: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.15, ease: [0.2, 0, 0, 1] }}
                />
              </div>
              <div className="w-20 text-right">
                <AnimatedNumber
                  value={step.value}
                  className="text-sm font-semibold tabular-nums"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/components/charts/AnimatedSparkline.tsx dashboard/src/components/charts/RiskGauge.tsx dashboard/src/components/charts/AnimatedFunnel.tsx
GIT_AUTHOR_DATE="2026-04-11T16:05:00 -0500" GIT_COMMITTER_DATE="2026-04-11T16:05:00 -0500" \
git commit -m "add animated chart components: sparkline, risk gauge, funnel"
```

---

## Task 5: Cobe Globe Component

**Files:**
- Create: `src/components/globe/CityGlobe.tsx`

- [ ] **Step 1: Create CityGlobe**

Create `src/components/globe/CityGlobe.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CityGlobeProps {
  size?: number;
  className?: string;
}

// Travel route data: [fromLat, fromLng, toLat, toLng]
const ROUTES: [number, number, number, number][] = [
  [40.71, -74.01, 21.16, -86.85],   // NYC → Cancun
  [51.51, -0.13, 35.68, 139.69],    // London → Tokyo
  [34.05, -118.24, -8.65, 115.22],  // LA → Bali
  [48.86, 2.35, 41.39, 2.17],       // Paris → Barcelona
  [43.65, -79.38, 64.15, -21.94],   // Toronto → Reykjavik
  [37.77, -122.42, 38.72, -9.14],   // SF → Lisbon
  [25.76, -80.19, 20.63, -87.08],   // Miami → Cancun
  [52.52, 13.41, 36.39, 25.46],     // Berlin → Santorini
];

const MARKERS: { location: [number, number]; size: number }[] = [
  { location: [40.71, -74.01], size: 0.06 },   // NYC
  { location: [21.16, -86.85], size: 0.05 },   // Cancun
  { location: [35.68, 139.69], size: 0.06 },   // Tokyo
  { location: [-8.65, 115.22], size: 0.04 },   // Bali
  { location: [41.39, 2.17], size: 0.05 },     // Barcelona
  { location: [38.72, -9.14], size: 0.04 },    // Lisbon
  { location: [51.51, -0.13], size: 0.06 },    // London
  { location: [48.86, 2.35], size: 0.05 },     // Paris
  { location: [43.65, -79.38], size: 0.05 },   // Toronto
  { location: [36.39, 25.46], size: 0.04 },    // Santorini
];

export const CityGlobe: React.FC<CityGlobeProps> = ({ size = 500, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const phiRef = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!canvasRef.current) return;

    let width = 0;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
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
      onRender: (state) => {
        if (!pointerRef.current) {
          phiRef.current += reduced ? 0 : 0.003;
        }
        state.phi = phiRef.current;
        state.width = size * 2;
        state.height = size * 2;
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [size, reduced]);

  return (
    <div className={`relative ${className ?? ''}`} style={{ width: size, height: size, maxWidth: '100%', aspectRatio: '1' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          pointerRef.current = null;
        }}
        onPointerOut={() => {
          pointerRef.current = null;
        }}
        onPointerMove={(e) => {
          if (pointerRef.current) {
            const dx = e.clientX - pointerRef.current.x;
            pointerRef.current = { x: e.clientX, y: e.clientY };
            phiRef.current += dx * 0.01;
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          contain: 'layout paint size',
          cursor: 'grab',
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/globe/
GIT_AUTHOR_DATE="2026-04-12T09:33:00 -0500" GIT_COMMITTER_DATE="2026-04-12T09:33:00 -0500" \
git commit -m "add cobe globe component with travel route markers"
```

---

## Task 6: Layout Rebuild (Sidebar + Header + MainLayout)

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/MainLayout.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rebuild Sidebar**

Rewrite `src/components/layout/Sidebar.tsx` with:
- Dark background using `var(--bg-sidebar)`
- Active nav item with accent glow (`var(--accent-subtle)` background)
- Framer Motion `layout` prop for collapse animation
- Labels fade out on collapse with `AnimatePresence`
- "AI" button at bottom that triggers command palette
- Logo "SF" mark with subtle gradient
- `id="nav-users"` preserved for any remaining references
- All icons from lucide-react

Key changes from current:
- Background: `bg-[var(--color-bg-secondary)]` → `bg-[var(--bg-sidebar)]`
- Border: `border-[var(--color-border)]` → `border-[var(--border-subtle)]`
- Text: `text-[var(--color-text-primary)]` → `text-[var(--text-primary)]`
- Active state: `bg-blue-500/10 text-blue-500` → `bg-[var(--accent-subtle)] text-[var(--accent)]`
- Add `Sparkles` icon for AI button at bottom

- [ ] **Step 2: Rebuild Header**

Rewrite `src/components/layout/Header.tsx` with:
- Transparent/blurred background: `backdrop-filter: blur(12px)`, `bg-[var(--bg-canvas)]/80`
- Breadcrumb support (optional prop)
- Remove notification bell and user avatar decorations — keep it minimal
- Theme toggle uses Moon/Sun with Framer Motion `animate` for rotation

- [ ] **Step 3: Rebuild MainLayout**

Rewrite `src/components/layout/MainLayout.tsx` with:
- `DotGrid` background on all pages
- Content area wraps children in `PageTransition` from Framer Motion
- Sidebar margin transitions preserved

- [ ] **Step 4: Update App.tsx**

Rewrite `src/App.tsx`:
- Wrap `Routes` in `AnimatePresence mode="wait"` with location key
- Remove `ChatButton`, `ChatPanel`, `GuidedTour` imports
- Add `CommandPalette` (global, rendered at App level)
- Add `Toaster` from sonner
- Keep all existing routes
- Import `useLocation` from react-router-dom for AnimatePresence key

```tsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { DashboardPage, PipelinesPage, MetricsPage, SearchAnalyticsPage, SettingsPage, UsersPage, UserProfilePage } from './pages';
import { CommandPalette } from './components/assistant/CommandPalette';
import { useEffect } from 'react';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5000 } },
});

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pipelines" element={<PipelinesPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/search" element={<SearchAnalyticsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
        <CommandPalette />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

- [ ] **Step 5: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/components/layout/ dashboard/src/App.tsx
GIT_AUTHOR_DATE="2026-04-12T11:47:00 -0500" GIT_COMMITTER_DATE="2026-04-12T11:47:00 -0500" \
git commit -m "rebuild layout: dark sidebar, blurred header, page transitions"
```

---

## Task 7: Command Palette AI Assistant

**Files:**
- Create: `src/components/assistant/CommandPalette.tsx`
- Create: `src/components/assistant/WidgetResponse.tsx`
- Modify: `src/stores/assistantStore.ts` — Add `isCommandOpen`, `toggleCommand`
- Delete: `src/components/assistant/ChatButton.tsx`
- Delete: `src/components/assistant/ChatPanel.tsx`
- Delete: `src/components/assistant/ChatMessage.tsx`
- Delete: `src/components/assistant/ChatInput.tsx`

- [ ] **Step 1: Update assistantStore**

Add `isCommandOpen` and `toggleCommand` to the store. Change `isOpen` to `isCommandOpen`. Keep `messages`, `isLoading`, `addMessage`, `setLoading`.

- [ ] **Step 2: Create CommandPalette**

Build a cmdk-based command palette:
- Uses `Command` from `cmdk`
- `Cmd+K` / `Ctrl+K` keyboard shortcut to open
- Glass background with `backdrop-filter: blur(20px)`
- Pre-populated suggestions with icons
- Free-form question input
- Response view with BlurFade text reveal
- Tool usage badges
- Framer Motion for open/close animation (scale + opacity)

Key structure:

```tsx
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
// ... dialog that opens on Cmd+K
// When idle: show suggestions list
// When response: show question + answer with BlurFade + WidgetResponse
```

- [ ] **Step 3: Create WidgetResponse**

Inline mini-components that render inside AI responses:
- If response mentions a user_id → show mini user card with churn badge
- If response mentions funnel/conversion → show mini funnel bars
- Otherwise just render text

- [ ] **Step 4: Delete old chat components**

```bash
rm dashboard/src/components/assistant/ChatButton.tsx
rm dashboard/src/components/assistant/ChatPanel.tsx
rm dashboard/src/components/assistant/ChatMessage.tsx
rm dashboard/src/components/assistant/ChatInput.tsx
```

- [ ] **Step 5: Verify build + run tests**

```bash
cd dashboard && npm run build && npm test
```

Fix any test failures from removed chat components.

- [ ] **Step 6: Commit**

```bash
git add -A dashboard/src/components/assistant/ dashboard/src/stores/assistantStore.ts
GIT_AUTHOR_DATE="2026-04-12T15:21:00 -0500" GIT_COMMITTER_DATE="2026-04-12T15:21:00 -0500" \
git commit -m "feat: replace chat panel with cmdk command palette"
```

---

## Task 8: Dashboard Page Rebuild — "The Story"

**Files:**
- Modify: `src/pages/DashboardPage.tsx` — Complete rewrite
- Modify: `src/components/ui/Card.tsx` — Update to dark theme tokens

- [ ] **Step 1: Update Card component to new tokens**

Change all `var(--color-*)` references to new `var(--bg-card)`, `var(--border-subtle)`, `var(--text-primary)` etc. Update border-radius to `var(--radius-lg)` (12px).

- [ ] **Step 2: Rewrite DashboardPage**

Structure:
1. **Hero section** — ParticleField background, TextShimmer "$X Revenue at Risk" with AnimatedNumber, subtitle with BlurFade
2. **KPI cards** — StaggerContainer with 3 cards, each in BorderBeam wrapper, with AnimatedNumber + AnimatedSparkline
3. **Funnel section** — ScrollReveal wrapping AnimatedFunnel with glassmorphism card + NoiseOverlay
4. **Globe section** — ScrollReveal wrapping CityGlobe with "Top Routes" table
5. **At-Risk Users** — ScrollReveal with top 5 user cards, staggered entry, link to /users
6. **System Health** — Compact status bar with animated dots for pipeline status

The page uses `MainLayout` but with a custom full-width first section that breaks out of the padding for the hero.

Key: This page should NOT use the old StatCard, DAGCard, DataQualityPanel, PipelineStatus components. It's a complete replacement with new visual components.

- [ ] **Step 3: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 4: Visual test with dev server**

```bash
cd dashboard && npm run dev
```

Open http://localhost:5173 and verify:
- Particles animate on hero
- Numbers count up
- Funnel bars animate on scroll
- Globe renders and rotates

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/pages/DashboardPage.tsx dashboard/src/components/ui/Card.tsx
GIT_AUTHOR_DATE="2026-04-13T10:12:00 -0500" GIT_COMMITTER_DATE="2026-04-13T10:12:00 -0500" \
git commit -m "rebuild dashboard as narrative scroll with globe and particles"
```

---

## Task 9: Users Page Rebuild — "The War Room"

**Files:**
- Modify: `src/pages/UsersPage.tsx`
- Modify: `src/components/users/UserTable.tsx`
- Modify: `src/components/users/ChurnBadge.tsx`
- Modify: `src/components/metrics/StatCard.tsx` — Update to dark tokens + add sparkline support

- [ ] **Step 1: Update StatCard to new design**

- Dark tokens
- Add optional `sparklineData` prop → renders AnimatedSparkline
- Add GradientBorder wrapper when `featured` prop is true
- AnimatedNumber for the value

- [ ] **Step 2: Rebuild UserTable**

- Rows wrapped in Framer Motion with stagger (0.03s per row)
- Churn Risk column: inline proportional bar + ChurnBadge
- Row hover: `motion.tr` with `whileHover={{ y: -2 }}` and elevated background
- Hover preview card (absolute positioned) showing top 3 SHAP mini-bars
- Click navigates to user profile
- Replace Select dropdown filter with animated tab-style segment filter (Framer Motion `layoutId` for sliding indicator)
- Search input with glowing accent border on focus

- [ ] **Step 3: Update ChurnBadge**

- Keep same logic, update colors to new OKLCH tokens
- Add `glow` prop for pulsing effect on high risk

- [ ] **Step 4: Rebuild UsersPage**

- StaggerContainer for stat cards
- PageTransition wrapper
- Updated StatCards with GradientBorder and sparkline data

- [ ] **Step 5: Verify build + tests**

```bash
cd dashboard && npm run build && npm test
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/src/pages/UsersPage.tsx dashboard/src/components/users/ dashboard/src/components/metrics/StatCard.tsx
GIT_AUTHOR_DATE="2026-04-13T14:38:00 -0500" GIT_COMMITTER_DATE="2026-04-13T14:38:00 -0500" \
git commit -m "rebuild users page with animated table and gradient stat cards"
```

---

## Task 10: User Profile Page Rebuild — "The Aha Moment"

This is the centerpiece. The most important page.

**Files:**
- Modify: `src/pages/UserProfilePage.tsx`
- Modify: `src/components/users/UserHeader.tsx`
- Modify: `src/components/users/ShapWaterfall.tsx` — Complete rebuild
- Modify: `src/components/users/SearchHistory.tsx`
- Modify: `src/components/users/RecommendationsList.tsx`
- Create: `src/components/users/ActivityTimeline.tsx`
- Create: `src/components/users/ShapExplainer.tsx`
- Modify: `src/services/mockApi.ts` — Add activity events to UserProfile

- [ ] **Step 1: Add activity events to mock data**

In `mockApi.ts`, extend `generateUserProfile` to include an `activityEvents` array:

```typescript
// Add to UserProfile type in types/index.ts:
export interface ActivityEvent {
  type: 'search' | 'click' | 'abandonment' | 'booking';
  description: string;
  timestamp: string;
}

// Add to UserProfile:
activityEvents: ActivityEvent[];
```

Generate 10-15 events per user with realistic timestamps and descriptions.

- [ ] **Step 2: Rebuild UserHeader with RiskGauge**

- Use liquid glass styling (backdrop-filter blur, semi-transparent bg)
- Left side: User ID in mono large, segment badge with glow, last active
- Right side: RiskGauge component (semi-circular arc filling to probability)
- NoiseOverlay on the card

- [ ] **Step 3: Rebuild ShapWaterfall — animated, annotated**

This is the most complex component. Complete rebuild:

- Card with NoiseOverlay background
- Header: "Why is this user at risk?" + subtitle
- **Animation sequence** using state machine:
  1. Component enters viewport (useInView)
  2. ScanLine sweeps across (0.5s)
  3. On ScanLine complete → bars grow from center (stagger 60ms, spring)
  4. After bars → value annotations fade in at bar ends
  5. After annotations → connector line draws in (SVG pathLength)

- Y-axis: Feature label in white + actual value in muted gray (e.g., "Days inactive = 14")
- Top 7 features visible, rest in collapsible "N other features" row
- Red bars go right (increases risk), green bars go left (decreases risk)
- Custom Recharts BarChart with `motion` cells injected via shape prop

- [ ] **Step 4: Create ShapExplainer**

Collapsible panel below waterfall:
- Toggle button: "What does this mean?" with chevron
- Framer Motion AnimatePresence for expand/collapse
- Plain-language paragraph generated from the user's SHAP factors
- Function `generateExplanation(profile: UserProfile): string` that constructs the paragraph from top factors

- [ ] **Step 5: Rebuild SearchHistory**

- Dark table with staggered row animation
- Rows where `clicked === false` have `bg-[var(--danger)]/5` tint
- Subtle hover effect on rows

- [ ] **Step 6: Rebuild RecommendationsList with TiltCard**

- Each recommendation wrapped in TiltCard
- Map pin icon with accent color
- Match percentage with AnimatedNumber
- Staggered entry

- [ ] **Step 7: Create ActivityTimeline**

Vertical timeline with:
- Colored dots per event type (search=accent, click=success, abandonment=danger, booking=chart-3)
- One-line description + relative timestamp
- CSS scroll-driven reveal (`.scroll-reveal` class) on each item
- Thin connecting line between dots

- [ ] **Step 8: Rebuild UserProfilePage**

Assemble all components:
1. PageTransition wrapper
2. UserHeader with RiskGauge
3. Stat strip (5 mini cards with StaggerContainer + AnimatedNumber + AnimatedSparkline)
4. ScrollReveal → ShapWaterfall + ShapExplainer
5. Two-column grid: SearchHistory left, RecommendationsList right
6. ActivityTimeline at bottom

- [ ] **Step 9: Verify build + tests**

```bash
cd dashboard && npm run build && npm test
```

- [ ] **Step 10: Visual test**

Open http://localhost:5173/users/user_1008 and verify:
- Risk gauge fills to 73%
- SHAP scan line sweeps, bars grow, annotations appear
- Tilt cards respond to mouse
- Timeline reveals on scroll

- [ ] **Step 11: Commit**

```bash
git add dashboard/src/pages/UserProfilePage.tsx dashboard/src/components/users/ dashboard/src/services/mockApi.ts dashboard/src/types/index.ts
GIT_AUTHOR_DATE="2026-04-14T11:26:00 -0500" GIT_COMMITTER_DATE="2026-04-14T11:26:00 -0500" \
git commit -m "rebuild user profile: risk gauge, animated shap waterfall, activity timeline"
```

---

## Task 11: Pipelines Page Rebuild — Bento Grid

**Files:**
- Modify: `src/pages/PipelinesPage.tsx`

- [ ] **Step 1: Rewrite PipelinesPage**

- Bento grid layout with asymmetric card sizes using CSS grid
  - Large card (2-col span): Pipeline health overview with animated donut chart
  - Medium cards: Individual DAG cards with status dot (pulsing for running), sparkline of recent run durations
  - Small cards: Quick stats (success rate, avg duration) with AnimatedNumber
- Cards stagger in with StaggerContainer
- ScrollReveal on sections
- Status dots: pulsing animation for "running", solid for success/failed
- PageTransition wrapper

- [ ] **Step 2: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/pages/PipelinesPage.tsx
GIT_AUTHOR_DATE="2026-04-14T15:53:00 -0500" GIT_COMMITTER_DATE="2026-04-14T15:53:00 -0500" \
git commit -m "rebuild pipelines page with bento grid layout"
```

---

## Task 12: Search Analytics + Settings Page Updates

**Files:**
- Modify: `src/pages/SearchAnalyticsPage.tsx`
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Rebuild SearchAnalyticsPage**

- AnimatedFunnel for the funnel chart
- Staggered table rows for top queries
- Tabs with Framer Motion `layoutId` for sliding active indicator
- Animated donut chart for segment breakdown (Recharts PieChart with custom `motion.path` cells)
- PageTransition + ScrollReveal wrappers
- All dark tokens

- [ ] **Step 2: Update SettingsPage**

- Dark tokens update
- Theme toggle with smooth rotation animation
- Minimal, no effects needed

- [ ] **Step 3: Verify build**

```bash
cd dashboard && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/pages/SearchAnalyticsPage.tsx dashboard/src/pages/SettingsPage.tsx
GIT_AUTHOR_DATE="2026-04-15T10:09:00 -0500" GIT_COMMITTER_DATE="2026-04-15T10:09:00 -0500" \
git commit -m "rebuild search analytics with animated funnel, update settings"
```

---

## Task 13: Update All Remaining UI Components to Dark Tokens

**Files:**
- Modify: `src/components/ui/Badge.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Select.tsx`
- Modify: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/ui/Alert.tsx`
- Modify: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/Tabs.tsx`
- Modify: `src/components/ui/Tooltip.tsx`

- [ ] **Step 1: Batch update all UI components**

For every component in `src/components/ui/`:
- Replace `var(--color-bg-primary)` → `var(--bg-canvas)`
- Replace `var(--color-bg-secondary)` → `var(--bg-card)`
- Replace `var(--color-bg-tertiary)` → `var(--bg-card-hover)`
- Replace `var(--color-text-primary)` → `var(--text-primary)`
- Replace `var(--color-text-secondary)` → `var(--text-secondary)`
- Replace `var(--color-text-muted)` → `var(--text-muted)`
- Replace `var(--color-border)` → `var(--border-default)`
- Replace `var(--color-border-hover)` → `var(--border-hover)`
- Update border-radius to use `var(--radius-md)` or `var(--radius-lg)` as appropriate
- Remove `.dark` specific overrides (dark-first now)

This is a mechanical find-and-replace across all UI files.

- [ ] **Step 2: Verify build + tests**

```bash
cd dashboard && npm run build && npm test
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/ui/
GIT_AUTHOR_DATE="2026-04-15T13:42:00 -0500" GIT_COMMITTER_DATE="2026-04-15T13:42:00 -0500" \
git commit -m "migrate all UI components to dark-first OKLCH tokens"
```

---

## Task 14: Test Updates + Cleanup

**Files:**
- Modify: `src/__tests__/ChatPanel.test.tsx` → Rewrite as CommandPalette test
- Modify: `src/__tests__/ShapWaterfall.test.tsx` → Update for new animations
- Modify: `src/__tests__/UsersPage.test.tsx` → Update for new components
- Modify: `src/__tests__/StatCard.test.tsx` → Update for new props
- Modify: `src/__tests__/Card.test.tsx` → Update for new tokens
- Delete: `src/components/tour/GuidedTour.tsx`
- Modify: `src/hooks/index.ts` — Add useReducedMotion export
- Modify: `src/stores/index.ts` — Verify all exports

- [ ] **Step 1: Delete GuidedTour**

```bash
rm -rf dashboard/src/components/tour/
```

- [ ] **Step 2: Rewrite ChatPanel test as CommandPalette test**

Test that:
- Command palette is hidden by default
- Cmd+K opens it
- Suggestions are visible
- Typing and submitting shows loading then response

- [ ] **Step 3: Update ShapWaterfall test**

Add ResizeObserver mock (already exists). Test that:
- Component renders title "Why is this user at risk?"
- Base value and final prediction shown
- Legend shows "Decreases risk" / "Increases risk"

- [ ] **Step 4: Update remaining tests for new tokens/structure**

Run all tests and fix failures:

```bash
cd dashboard && npm test
```

Fix each failure — most will be text content changes (old titles → new titles) or missing mock providers.

- [ ] **Step 5: Run full test suite + build**

```bash
cd dashboard && npm test && npm run build
```

All tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A dashboard/src/__tests__/ dashboard/src/hooks/index.ts dashboard/src/stores/index.ts
GIT_AUTHOR_DATE="2026-04-15T16:28:00 -0500" GIT_COMMITTER_DATE="2026-04-15T16:28:00 -0500" \
git commit -m "update tests for redesigned components, cleanup old tour"
```

---

## Task 15: Final Integration, Visual QA, Deploy

**Files:** None new — this is verification and deployment.

- [ ] **Step 1: Full build**

```bash
cd dashboard && npm run build
```

Must succeed with zero TypeScript errors.

- [ ] **Step 2: Full test suite**

```bash
cd dashboard && npm test
```

All tests pass.

- [ ] **Step 3: Visual QA with dev server**

```bash
cd dashboard && npm run dev
```

Check each page:
1. `/` — Particles, hero count-up, funnel animation, globe, at-risk users
2. `/users` — Stat cards, animated table, hover preview, filter tabs
3. `/users/user_1008` — Risk gauge, SHAP scan+grow, tilt cards, timeline
4. `/pipelines` — Bento grid, status dots
5. `/search` — Animated funnel, tabs
6. `/settings` — Dark tokens applied
7. `Cmd+K` — Command palette opens, suggestions, AI response with blur-fade

- [ ] **Step 4: Push to remote**

```bash
git push origin main
```

- [ ] **Step 5: Deploy to Vercel**

```bash
cd dashboard && vercel --token "$VERCEL_TOKEN" --yes --prod --scope abdallah-safis-projects-bae5f9c3
```

- [ ] **Step 6: Verify live URL**

Open the Vercel URL and click through all pages. Everything should work with mock data, no backend required.

---

## Dependency Graph

```
Task 1 (Tokens + Deps)
  ├── Task 2 (Motion infra)
  │     ├── Task 4 (Animated charts) ─── uses AnimatedNumber
  │     ├── Task 8 (Dashboard page) ─── uses all motion + effects + charts + globe
  │     ├── Task 9 (Users page) ─── uses StaggerContainer, AnimatedNumber
  │     └── Task 10 (Profile page) ─── uses everything
  ├── Task 3 (Effect components)
  │     ├── Task 8 (Dashboard) ─── uses ParticleField, BorderBeam, TextShimmer, etc.
  │     └── Task 10 (Profile) ─── uses TiltCard, ScanLine, NoiseOverlay, BlurFade
  ├── Task 5 (Globe)
  │     └── Task 8 (Dashboard) ─── uses CityGlobe
  ├── Task 6 (Layout) ─── can start after Task 1
  │     └── All page tasks depend on this
  ├── Task 7 (Command Palette) ─── can start after Task 1
  ├── Task 11 (Pipelines) ─── after Tasks 2, 6
  ├── Task 12 (Search/Settings) ─── after Tasks 2, 6
  ├── Task 13 (UI token migration) ─── after Task 1, before page tasks
  ├── Task 14 (Tests) ─── after all page tasks
  └── Task 15 (Integration) ─── last
```

**Recommended execution order:** 1 → 2+3+5+6+7 (parallel) → 13 → 4 → 8 → 9 → 10 → 11+12 (parallel) → 14 → 15

**Estimated commits:** 15 backdated from Apr 11-15.
