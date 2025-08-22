# SearchFlow Dashboard

A modern React + TypeScript dashboard for monitoring the SearchFlow analytics platform.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The dashboard will be available at http://localhost:5173

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript 5.6** | Type safety |
| **Vite** | Build tooling |
| **Tailwind CSS** | Styling |
| **Zustand** | State management |
| **React Query** | Data fetching |
| **Recharts** | Visualizations |
| **Lucide React** | Icons |

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/           # 15 primitive components (Button, Card, Modal, etc.)
│   ├── charts/       # 7 chart components (LineChart, FunnelChart, etc.)
│   ├── layout/       # 4 layout components (Sidebar, Header, MainLayout)
│   ├── pipeline/     # 5 pipeline components (DAGCard, PipelineStatus)
│   ├── metrics/      # 4 metrics components (StatCard, DataQualityPanel)
│   └── search/       # 3 search components (SearchInput, ResultsTable)
├── pages/            # 5 pages (Dashboard, Pipelines, Metrics, Search, Settings)
├── stores/           # 4 Zustand stores (pipeline, metrics, search, theme)
├── hooks/            # React Query hooks for data fetching
├── services/         # Mock API for development
├── types/            # TypeScript type definitions
└── utils/            # Utility functions (formatting, styling)
```

## 🎨 Features

- **38 Reusable Components**: Production-ready UI components
- **Real-time Search**: 300ms debounced queries for optimal UX
- **Dark/Light Mode**: System preference detection + manual toggle
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Data Polling**: Configurable refresh intervals (5s, 10s, 15s, 30s)
- **Interactive Charts**: Funnels, area charts, line charts, bar charts

## 📊 Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Overview with stats, pipeline health, search funnel |
| **Pipelines** | DAG cards with status, recent runs timeline |
| **Metrics** | Data quality tests, record counts, trend charts |
| **Search Analytics** | Funnel visualization, top queries, user segments |
| **Settings** | Theme selection, refresh intervals, notifications |

## 🔧 Development

```bash
# Run linting
npm run lint

# Type checking
npm run typecheck

# Build for production
npm run build
```

## 📈 Resume Claims Supported

- ✅ **35+ reusable React components** → 38 components
- ✅ **Real-time search with debounced queries** → 300ms debounce
- ✅ **State management with Zustand** → 4 stores
- ⏳ **94% test coverage** → Testing phase pending
