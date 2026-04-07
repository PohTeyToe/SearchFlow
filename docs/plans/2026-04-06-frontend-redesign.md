# SearchFlow Frontend Redesign — "Awe-Inspiring Analytics"

## Vision

Transform SearchFlow from a clean dashboard into an **experience** — something between Stripe Sessions, a flight tracker globe, and Spotify Wrapped. Dark canvas, animated particles, liquid glass surfaces, scroll-driven reveals, and a SHAP waterfall that feels like it's explaining the future.

The goal: someone opens this URL and their first thought is "this person built *this*?"

## Design Pillars

1. **Cinematic first impression** — The landing page tells a story, not a spreadsheet
2. **Every interaction is alive** — Nothing just "appears." Everything animates in with purpose
3. **ML is the hero** — The SHAP waterfall and churn predictions are the centerpiece, not hidden
4. **Spatial depth** — Layers, glass, particles create a sense of dimension on a flat screen
5. **2026 bleeding edge** — Liquid Glass, OKLCH, scroll-driven CSS, View Transitions, cmdk

## New Dependencies

| Package | Size | Purpose |
|-|-|-|
| `framer-motion` | ~40KB gz | Core animation engine |
| `cobe` | ~5KB | WebGL globe for user locations |
| `cmdk` | ~5KB | Command palette (AI assistant) |
| `@fontsource/geist-sans` | ~20KB | Typography |
| `rdev/liquid-glass-react` | ~8KB | Liquid glass card effects |
| `countup.js` | ~4KB | Animated number counting |

**Remove:** `driver.js` (replace tour with custom scroll-driven onboarding)

Total new bundle: ~82KB gzipped. Worth it.

## Design System

### Color Tokens (OKLCH)

```css
:root {
  /* Surfaces */
  --bg-canvas: oklch(0.07 0 0);          /* #111 - deep dark */
  --bg-card: oklch(0.12 0 0);            /* #1a1a1a */
  --bg-card-hover: oklch(0.15 0 0);      /* #222 */
  --bg-elevated: oklch(0.18 0.01 270);   /* slight blue tint for glass */
  --bg-sidebar: oklch(0.08 0.005 270);   /* near-black blue */

  /* Borders */
  --border-subtle: oklch(1 0 0 / 0.06);
  --border-default: oklch(1 0 0 / 0.10);
  --border-hover: oklch(1 0 0 / 0.15);

  /* Text */
  --text-primary: oklch(0.93 0 0);       /* #e8e8e8 */
  --text-secondary: oklch(0.65 0 0);     /* #8b8b8b */
  --text-muted: oklch(0.45 0 0);         /* #555 */

  /* Accent - Indigo */
  --accent: oklch(0.65 0.25 270);        /* vivid indigo */
  --accent-glow: oklch(0.65 0.25 270 / 0.15);
  --accent-subtle: oklch(0.65 0.25 270 / 0.08);

  /* Semantic */
  --success: oklch(0.72 0.19 160);       /* emerald */
  --warning: oklch(0.80 0.18 80);        /* amber */
  --danger: oklch(0.65 0.25 25);         /* red */

  /* Chart palette (5 colors, OKLCH wide gamut) */
  --chart-1: oklch(0.65 0.25 270);       /* indigo */
  --chart-2: oklch(0.72 0.19 160);       /* emerald */
  --chart-3: oklch(0.78 0.18 80);        /* amber */
  --chart-4: oklch(0.65 0.26 310);       /* purple */
  --chart-5: oklch(0.70 0.20 200);       /* cyan */
}
```

### Typography

```
Font: Geist Sans (variable weight 100-900)
Display: Geist Sans, letter-spacing: -0.04em

Scale:
  hero:     48px / 700 / -0.04em  (animated count-up numbers)
  h1:       24px / 600 / -0.02em
  h2:       18px / 600 / -0.01em
  h3:       14px / 600
  body:     14px / 400 / 1.5 line-height
  caption:  12px / 500 / 0.05em uppercase
  mono:     13px / JetBrains Mono (user IDs, values)

All numeric displays: font-variant-numeric: tabular-nums
```

### Spacing

Strict 4px base: `4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96`

### Radius

Cards: 12px | Buttons: 8px | Inputs: 8px | Badges: full (9999px) | Modals: 16px

### Transitions

Default: 200ms `cubic-bezier(0.2, 0, 0, 1)` (Material Standard)
Enter: 350ms `cubic-bezier(0.05, 0.7, 0.1, 1)` (Emphasized decelerate)
Exit: 150ms `cubic-bezier(0.3, 0, 0.8, 0.15)` (Emphasized accelerate)

## Page Designs

### 1. Dashboard (Home) — "The Story"

The dashboard is a **vertical narrative** that tells the SearchFlow story in one scroll.

**First viewport (above the fold):**
- Full-width dark canvas with animated **particle field** as background (subtle, ~100 particles, slow drift, color-coded: green for healthy searches, amber for at-risk, red for churned)
- Center-stage hero metric: **"$135K Revenue at Risk"** in 48px Geist, counts up from $0 with `useSpring`, text has a subtle **shimmer/shine effect** (Ibelick style)
- Below the number: `"from 847 abandoned searches this week"` in muted text, fades in 200ms after number finishes
- Three supporting KPI cards stagger in below (0.08s delay each):
  - "6,648 Searches" with 7-day sparkline
  - "3.5% Conversion" with delta arrow
  - "13 Users at Risk" with pulsing red dot — clicking navigates to /users

**KPI Card Design:**
- `var(--bg-card)` background
- 1px `var(--border-subtle)` border
- **Border beam effect** (Magic UI) on hover — a light that traces the card border
- Number uses count-up animation on first appear
- Tiny sparkline chart (7 data points) in the card corner
- `whileHover: { y: -4, borderColor: var(--border-hover) }` with spring

**Second section (scroll reveals):**
- **Booking Funnel** — Full-width animated funnel
  - Bars grow from left to right on scroll-reveal (CSS `animation-timeline: view()`)
  - Each bar has a percentage label that counts up
  - Drop-off annotations between bars: "68% drop-off" with a subtle red glow
  - Glassmorphism card container with noise grain overlay

**Third section:**
- **Cobe Globe** — Interactive WebGL globe showing user search locations
  - Arcs animate between origin/destination city pairs
  - Globe auto-rotates slowly, stops on hover
  - Below globe: "Top Routes" mini-table (origin → destination, count)
  - This replaces the old pipeline cards on the home page

**Fourth section:**
- **At-Risk Users Preview** — Top 5 highest-churn users as horizontal cards
  - Each card: user ID (mono), churn gauge (mini arc), top SHAP factor, segment badge
  - Cards stagger in from right
  - "View all users →" link with arrow animation
  - Clicking a card navigates to `/users/:id` with a **shared layout transition** (the card expands into the full profile page)

**Fifth section (compact):**
- **System Health Bar** — Minimal horizontal strip
  - Three dots (Ingestion, Transformation, Reverse ETL) with status colors
  - "All systems healthy" or "1 pipeline running" text
  - Click expands to full pipeline view
  - This replaces the bulky DAG cards — pipelines are secondary info

### 2. Users Page — "The War Room"

**Header area:**
- Three stat cards with count-up: Total Users, High Risk, Avg Churn %
- Stats have **animated gradient borders** (Ibelick) — the border color shifts slowly

**Table:**
- Rows stagger in (0.03s per row, `y: 12 → 0, opacity`)
- Churn Risk column: **inline mini progress bar** (proportional fill with risk color) PLUS the percentage badge
- Hover a row → row lifts slightly (`y: -2`), shows a **preview card** floating to the right with:
  - Top 3 SHAP factors as mini horizontal bars
  - "Click to explore →"
- Click row → **View Transition** to user profile (row morphs into header)

**Search/Filter bar:**
- Input has a glowing `var(--accent)` border on focus with animated glow spread
- Segment filter as **direction-aware tabs** (cult/ui style) — the active indicator slides smoothly between options instead of a dropdown

### 3. User Profile — "The Aha Moment"

This is the page that makes people go "wow."

**Hero section:**
- Full-width **liquid glass card** with user info
- Left: User ID (mono, large), segment badge (glowing), last active
- Right: **Animated risk gauge** — semi-circular SVG arc that fills up over 1.2s with emphasized decelerate easing
  - 0-30%: emerald fill with emerald glow
  - 30-70%: amber fill with amber glow  
  - 70-100%: red fill with pulsing red glow
  - Large percentage number in center counts up
  - Below gauge: risk level text ("High Risk") with appropriate color

**Stat strip:**
- 5 mini stat cards in a row: Total Searches, Avg Session, Days Since Signup, Click-Through Rate, Bookings
- Each card has a sparkline and count-up number
- Cards stagger in

**SHAP Waterfall (centerpiece):**
- Card with **subtle noise grain background** for depth
- Header: "Why is this user at risk?" (not "SHAP Feature Attribution" — plain language)
- Subheader: "Each bar shows how a feature pushes the prediction higher or lower"
- **Animation sequence** (triggered on scroll-reveal):
  1. A thin vertical **scanning line** sweeps left-to-right across the chart area (200ms)
  2. Bars grow from the center line outward (staggered, 0.06s per bar, spring physics)
  3. Value annotations fade in at bar ends (+0.23, -0.15)
  4. A thin **connector line** draws in showing the cumulative path from base → prediction
- Y-axis shows both feature label AND actual value: "Days inactive = 14" (label in white, value in muted gray)
- Top 7 features shown, rest collapsed into "3 other features" expandable row
- **"What does this mean?" toggle** — expands a plain-language paragraph:
  > "This user hasn't logged in for 14 days, which is the #1 factor increasing their churn risk. Their low lifetime value ($23) and declining search frequency also contribute. However, their high click-through rate when they DO search suggests they find relevant results — a re-engagement campaign with personalized deals could bring them back."

**Below the waterfall (two columns):**
- **Left: Search History** — Table with scroll animation on rows
  - Query, time, results, clicked (green/gray badge), destination
  - Rows that resulted in NO click have a subtle red-tinted background

- **Right: Recommendations** — Destination cards with **3D tilt effect** (Aceternity)
  - Hover a card → it tilts toward the cursor, showing depth
  - Each card: destination name, match %, reason
  - Map pin icon with accent color

**Bottom: Activity Timeline**
- Vertical timeline with colored dots for events
- Event types: search (blue), click (green), abandonment (red), booking (gold)
- Timeline reveals on scroll (CSS scroll-driven animation)
- Each event has a one-line description and timestamp

### 4. AI Assistant — "The Command Center"

**No floating bubble.** The assistant is accessed via:
1. **`Cmd+K` / `Ctrl+K`** — Opens a **cmdk command palette** center-screen
2. **Sidebar icon** — "AI" icon in the sidebar, opens the same palette

**Command Palette Design:**
- Centered modal, 640px wide, dark glass background (`backdrop-filter: blur(20px)`)
- Search input at top with glowing accent border
- **Pre-populated suggestions** below input:
  - "Why is user_1008 at risk?" (with churn icon)
  - "Show conversion funnel" (with chart icon)  
  - "Which destinations are trending?" (with map icon)
  - "Break down user segments" (with users icon)
- Typing filters suggestions + allows free-form questions
- Pressing Enter on a suggestion or custom question → palette transforms into response view:
  - Question shown at top
  - Response animates in with **blur-fade** (Magic UI) — text starts blurred, sharpens word by word
  - Tool usage badges appear at bottom
  - "Ask another question" input at bottom
  - **Widget responses**: If the question is about a user, show a mini user card inline. If about funnels, show a mini funnel chart inline.

### 5. Pipelines Page — "The Grid"

- **Bento grid layout** — asymmetric cards of different sizes
  - Large card: Pipeline health overview (chart)
  - Medium cards: Individual DAGs with status, last run, sparkline
  - Small cards: Quick stats (success rate, avg duration)
- Cards use **elastic grid scroll** effect — slight elastic deformation on scroll
- Status indicators are animated dots (pulsing for running, solid for success, etc.)

### 6. Search Analytics Page

- Funnel chart with **bar grow animation** on reveal
- Top queries table with staggered row entry
- Segment breakdown as **animated donut chart** with draw-in effect
- Tabs use **shared layout animation** (Framer Motion `layoutId`) for the active indicator

### 7. Settings Page

- Clean, minimal. No experimental effects needed.
- Theme toggle with smooth transition
- Refresh interval sliders

## Global Elements

### Navigation Sidebar
- Dark (`var(--bg-sidebar)`), 240px expanded, 56px collapsed
- Logo: "SF" mark with subtle gradient glow
- Nav items: icon + label, active item has accent background glow (`var(--accent-subtle)`)
- Collapse animation: `layout` prop, icons remain, labels fade out
- Bottom: "AI" button for command palette, theme toggle

### Page Transitions
- Route changes use **Framer Motion AnimatePresence** with `mode="wait"`
- Enter: `opacity: 0→1, y: 8→0`, 200ms emphasized decelerate
- Exit: `opacity: 1→0, y: 0→-8`, 150ms emphasized accelerate
- When navigating from Users table → User Profile: **shared layout transition** where the clicked row expands into the profile header

### Background
- **Ambient particle field** on dashboard home only (performance)
- Other pages: subtle **dot grid pattern** (Vercel-style) with CSS radial gradient
- Noise grain texture overlay on all cards (SVG `feTurbulence`, inlined)

### Loading States
- Skeleton shimmer screens matching exact component dimensions
- Skeleton → content transition via AnimatePresence (skeleton fades out 150ms, content fades in 300ms)
- Hero metrics show "---" placeholder then count up when data arrives

### Toast Notifications
- **Sonner** for toast notifications (stacking animation, swipe-to-dismiss)
- Used for: "Data refreshed", "Pipeline completed", etc.

### Accessibility
- `prefers-reduced-motion`: all animations respect this, falling back to instant transitions
- `tabular-nums` on all numbers
- Keyboard navigation on all interactive elements
- WCAG AA contrast ratios on all text (verified against dark backgrounds)
- `useReducedMotion` hook wrapping all Framer Motion animations

### Responsive
- Sidebar collapses to icon rail at `< 1024px`
- Bento grids collapse to single column at `< 768px`
- Globe hidden on mobile (performance), replaced with a static map
- Command palette goes full-width on mobile

## Animation Inventory

| Element | Library | Trigger | Duration | Easing |
|-|-|-|-|-|
| Hero number count-up | countup.js | On mount | 1200ms | easeOut |
| KPI card stagger | Framer Motion | On mount | stagger 80ms, each 350ms | [0.05,0.7,0.1,1] |
| Card hover lift | Framer Motion | Hover | 250ms | spring(260,20) |
| Border beam | Magic UI | Hover | continuous | linear |
| Funnel bar growth | CSS scroll | Scroll into view | 800ms | ease-out |
| Globe rotation | Cobe | Continuous | 60fps | linear |
| SHAP scan line | Framer Motion | Scroll into view | 400ms | linear |
| SHAP bar growth | Framer Motion | After scan | stagger 60ms, 500ms | spring(100,15) |
| Risk gauge fill | Framer Motion | On mount | 1200ms | [0.05,0.7,0.1,1] |
| Page transition | Framer Motion | Route change | 200ms in, 150ms out | Material Standard |
| Table row stagger | Framer Motion | On mount | stagger 30ms, 300ms | [0.2,0,0,1] |
| Command palette | cmdk + FM | Cmd+K | 200ms | spring(300,30) |
| Blur-fade text | Framer Motion | AI response | 600ms | easeOut |
| 3D card tilt | CSS transform | Hover | 200ms | ease-out |
| Liquid glass | liquid-glass-react | Static | N/A | N/A |
| Sparkline draw | SVG pathLength | On mount | 500ms | easeOut |
| Gradient border | CSS animation | Continuous | 3s | linear |
| Timeline reveal | CSS scroll | Scroll into view | 400ms per item | ease-out |
| Particle field | Canvas 2D | Continuous | 60fps | N/A |
| Noise grain | SVG filter | Static | N/A | N/A |
| Dot grid bg | CSS radial-gradient | Static | N/A | N/A |

## File Structure (New/Changed)

```
src/
  components/
    effects/
      ParticleField.tsx       -- Canvas 2D ambient particles
      DotGrid.tsx             -- CSS dot grid background
      NoiseOverlay.tsx         -- SVG noise grain texture
      BorderBeam.tsx           -- Magic UI border beam effect
      GradientBorder.tsx       -- Animated gradient border
      TextShimmer.tsx          -- Text shine/shimmer effect
      BlurFade.tsx             -- Blur-to-sharp text reveal
      LiquidGlassCard.tsx      -- Liquid glass wrapper
      TiltCard.tsx             -- 3D tilt on hover
      ScanLine.tsx             -- Scanning line reveal
    globe/
      CityGlobe.tsx            -- Cobe globe with travel routes
    charts/
      AnimatedFunnel.tsx        -- Funnel with bar growth
      AnimatedSparkline.tsx     -- Tiny inline sparkline
      RiskGauge.tsx             -- Semi-circular risk gauge
    assistant/
      CommandPalette.tsx        -- cmdk-based AI interface
      WidgetResponse.tsx        -- Inline chart/card in AI response
    motion/
      AnimatedNumber.tsx        -- Count-up number component
      StaggerContainer.tsx      -- Reusable stagger wrapper
      PageTransition.tsx        -- Route transition wrapper
      ScrollReveal.tsx          -- Scroll-triggered reveal
    users/
      ShapWaterfall.tsx         -- REBUILT: animated, annotated, connector line
      UserHeader.tsx            -- REBUILT: liquid glass, risk gauge
      SearchHistory.tsx         -- REBUILT: animated rows, tinted backgrounds
      RecommendationsList.tsx   -- REBUILT: 3D tilt cards
      ActivityTimeline.tsx      -- NEW: vertical event timeline
      ShapExplainer.tsx         -- NEW: plain-language explanation toggle
    layout/
      Sidebar.tsx               -- REBUILT: dark, collapsible, glow effects
      Header.tsx                -- REBUILT: minimal, breadcrumbs
      MainLayout.tsx            -- REBUILT: with page transitions
  pages/
    DashboardPage.tsx           -- REBUILT: narrative scroll story
    UsersPage.tsx               -- REBUILT: animated table, preview cards
    UserProfilePage.tsx         -- REBUILT: gauge, animated SHAP, timeline
    PipelinesPage.tsx           -- REBUILT: bento grid
    SearchAnalyticsPage.tsx     -- REBUILT: animated charts
    SettingsPage.tsx            -- Minor polish
  styles/
    tokens.css                  -- OKLCH design tokens
    noise.css                   -- SVG noise filter definitions
    scrollAnimations.css        -- CSS scroll-driven animations
```
