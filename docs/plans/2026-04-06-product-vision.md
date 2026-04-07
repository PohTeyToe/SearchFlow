# SearchFlow Product Vision & Brainstorm

> Status: BRAINSTORM COMPLETE — ready for implementation planning
> Date: April 6, 2026
> Next step: Build the polished frontend (user churn profiles, AI chat, guided tour)

---

## Product Identity

### What SearchFlow Is

SearchFlow turns search abandonment into retained revenue. It streams search events through ML models that explain why users leave and what to do about it — from event to action in one platform.

**Not a demo. Not a "reference architecture." A product.**

The travel search domain is the initial vertical, but the system works for any search-driven platform (e-commerce, SaaS, job boards, marketplaces).

### One-Liners (by audience)

| Audience | Description |
|-|-|
| Recruiter (10s) | "A search analytics platform I built end-to-end. Predicts who's about to churn, explains why with ML, and triggers retention actions automatically. 14 services, 180+ tests." |
| Hiring manager (1min) | "Search abandonment is a massive revenue problem. SearchFlow streams events through Kafka, runs XGBoost churn prediction with SHAP explanations, generates recommendations, and pushes actions to CRM/email via reverse ETL. I also built an LLM assistant that lets non-technical users query the data in plain English." |
| Senior engineer (5min) | Walk the architecture: event generator → Kafka 4.0 (KRaft) → DuckDB consumer → dbt star schema → Airflow orchestration → XGBoost/SHAP churn + hybrid recommender + sentiment → FastAPI serving → reverse ETL to Postgres/Redis/email → LangChain assistant with tool-calling → React dashboard. MLflow tracks experiments. 180+ tests, CI with 7 jobs. |

### Resume Bullets (XYZ format)

**Data Engineering:**
"Built SearchFlow, a real-time data platform streaming 10K+ search events/min through Kafka 4.0 into a DuckDB warehouse with dbt transformations, Airflow orchestration, and reverse ETL — 14 containerized services, 180+ tests."

**ML Engineering:**
"Built SearchFlow, an ML-powered search analytics platform with XGBoost churn prediction (SHAP explanations), hybrid recommendation engine, and sentiment analysis, served via FastAPI with MLflow experiment tracking — 180+ tests, end-to-end from feature engineering to production serving."

**Full-Stack / SWE:**
"Built SearchFlow, a 14-service distributed analytics platform (Kafka, FastAPI, React, LangChain) with real-time event streaming, ML-powered predictions, an AI assistant for natural language queries, and a React dashboard — 180+ tests, Docker Compose, CI/CD."

### Cover Letter (2-3 sentences)
"My most substantial project is SearchFlow, a platform I designed and built end-to-end that solves the search abandonment problem in e-commerce. It streams search behavior through Kafka, predicts churn with explainable ML, generates personalized recommendations, and pushes interventions to business tools automatically. The system spans 14 services with 180+ tests, and the experience taught me how data engineering, ML, and product thinking connect in production systems."

---

## Frontend Vision

### Current State
5 pages: Dashboard, Pipelines, Metrics, Search Analytics, Settings. Basic stat cards and funnel charts. Reads as a monitoring dashboard, not a product.

### Target State: 6 Key Screens

1. **Overview Dashboard** (exists, polish) — funnel, stat cards, pipeline health. Add "Users at Risk" count linking to Users page.

2. **Users / Churn Risk** (NEW, highest priority) — Table of users sortable by churn probability. Each row: user ID, risk badge (green/yellow/red), top SHAP factor, last active, segment. Click to drill into profile.

3. **User Profile / Detail** (NEW, the "aha moment") — One user's full story: churn probability over time (line chart), SHAP waterfall chart showing which factors push risk up/down, recent search history, recommendations generated, "Ask AI" button pre-loaded with user context.

4. **Search Analytics** (exists, enhance) — Add zero-results queries section. Add search-to-conversion pathways.

5. **AI Assistant** (NEW) — Persistent chat icon (bottom-right, like Intercom) opening a slide-over panel. Type natural language queries, get answers from the LangChain backend with formatted data/charts.

6. **Pipelines** (exists, keep) — DAG status. The "engineering credibility" page.

### Design Inspiration
- PostHog: user detail / session recording drill-down
- Linear: sidebar navigation, clean typography, status badges
- Vercel dashboard: deployment status cards → pipeline cards
- Amplitude: funnel visualization

### The "Aha Moment"
Clicking into a specific user and seeing the SHAP waterfall chart that explains "this user is 87% likely to churn because they searched 12 times without booking, got 3 zero-result pages, and their sentiment score dropped." That is when a technical interviewer says "okay, this person understands the full loop."

---

## Demo Experience

### When a recruiter visits the URL:
- Dashboard loads instantly with pre-populated data (not loading spinners)
- Seed: 7 days of realistic funnel data, 30+ users with varied churn scores, 5-6 DAGs with mixed status
- No login wall. No signup. It just works.

### Guided Tour (3-4 steps, skippable):
1. "This is your search-to-booking funnel"
2. "Click any user to see their churn risk explained by ML"
3. "Ask the AI assistant any question about your data"
4. "These pipelines run automatically to keep predictions fresh"

Use react-joyride or driver.js. Subtle, not annoying.

### Pre-populated data must feel real:
- Realistic destination names (not test_query_1)
- Plausible session durations, varied time zones
- Data comes from the synthetic generator, not hardcoded mocks

---

## Roadmap

### v2 (Next Build)
- User-level churn profiles with SHAP waterfall in frontend
- AI assistant chat panel integrated in UI with streaming
- Real-time event count via WebSocket (ticking number shows "live")
- Pre-seeded demo data that loads instantly
- 3-step guided tour
- Deploy frontend to Vercel with seed data

### v3 (Ambitious)
- A/B test framework: define interventions, track which reduces churn
- Multi-tenant: upload CSV of search events, get predictions
- Alerting: configurable thresholds ("notify when churn > 40% for segment X")
- Custom domain (searchflow.dev)

### Interview Story ("Where is this going?")
"Right now SearchFlow proves the end-to-end loop: event to prediction to action. Next is closing the feedback loop — measuring whether interventions actually reduced churn, which turns it into an experimentation platform. Longer term, multi-tenant so any e-commerce site can plug in their search events and get churn predictions without building their own ML pipeline."

---

## Interview Prep

### 5 Hardest Questions + Best Answers

**Q: "This is synthetic data. How do you know it works with real data?"**
A: "The models use behavioral features (search frequency, session depth, engagement rate) that transfer across domains. The synthetic generator models realistic distributions. But I'd say openly that real data would surface distribution shifts — that's why I built evaluation with proper train/test splits and MLflow tracking. The pipeline is the deliverable, not the model weights."

**Q: "Why not just use Amplitude or Mixpanel?"**
A: "Those solve analytics — they show you what happened. SearchFlow predicts what will happen, explains why with SHAP, and pushes automated actions via reverse ETL. The closed loop from insight to action is the differentiation."

**Q: "What would break first at scale?"**
A: "DuckDB. It's single-node. At scale I'd swap it for ClickHouse or BigQuery. Kafka scales horizontally. The ML serving layer would need canary deployments and a load balancer — right now it's a single FastAPI instance."

**Q: "Walk me through a prediction end-to-end."**
A: "Search event hits Kafka. Consumer writes to warehouse. dbt computes user features. XGBoost outputs churn probability. SHAP computes feature contributions. Reverse ETL checks threshold, pushes to retention system. Dashboard shows it in real-time. Batch scoring via Airflow, event ingestion continuous via Kafka."

**Q: "What was the hardest engineering decision?"**
A: "Real-time per-event prediction vs. batch scoring. Per-event needs a feature store. Batch via Airflow is simpler and for churn the latency doesn't matter — you need to know within hours, not milliseconds. I chose batch to keep the architecture tractable."

### 2-Minute Architecture Pitch
"SearchFlow has three layers. Data: event generator → Kafka → DuckDB → dbt transforms. ML: Airflow orchestrates training three models — XGBoost churn with SHAP, sentiment analysis, hybrid recommender. MLflow tracks experiments, FastAPI serves predictions. Action: reverse ETL pushes high-risk users to operational systems, LangChain assistant lets users query in natural language. React dashboard ties it together. 14 services, all containerized, 180+ tests."

### Tailoring to Role Type

| Role | Lead with | Downplay |
|-|-|-|
| DE | Kafka, dbt, Airflow, DuckDB, reverse ETL, data modeling | React, LangChain |
| ML | XGBoost, SHAP, MLflow, feature engineering, recommendations | Kafka internals, React |
| SWE | System design, Docker, FastAPI, React, LangChain, API design | dbt specifics, SHAP math |

---

## What to Build Next (Priority Order)

### Highest Impact

1. **User churn profile page with SHAP waterfall chart** (3-5 days) — The single highest-ROI change. Turns dashboard from "metrics display" into "product that does something." The API already returns feature importances.

2. **Pre-populated demo data** (1-2 days) — Embed static JSON seed dataset the frontend falls back to. 30 users, 7 days of funnel data. Table stakes for a clickable demo.

3. **AI assistant chat panel in UI** (2-3 days) — Slide-out chat panel hitting the existing LangChain backend. The interaction of "ask a question, get an answer with data" is extremely impressive in a demo.

4. **Deploy frontend to Vercel with seed data** (1 day) — A live URL recruiters can click is worth 10x a GitHub repo.

5. **3-step guided tour** (half a day) — react-joyride or driver.js. Tiny effort, big polish signal.

### What Does NOT Matter
- Adding more ML models (3 is plenty)
- Making event generator faster
- Adding more Docker services (14 is enough)
- Perfect dark mode (get light mode right first)

---

## Critiques to Address

From the brainstorm review, these weaknesses need honest answers:

| Critique | Response |
|-|-|
| "Domain-agnostic doesn't hold up" | Own the travel vertical. Say "starting with travel search, the architecture generalizes to any search-driven platform." |
| "Reverse ETL isn't really 'acting'" | Acknowledge it. "Right now it moves data. V2 adds real-time reranking — changing what users see based on predictions." |
| "No moat" | "The moat is the full loop, not any single model. Nobody else ships event streaming + ML predictions + automated action + LLM querying in one open-source stack." |
| "Synthetic data" | "The pipeline is the deliverable, not the model weights. Plug in real data, retrain, the infra works." |
| "14 services is over-engineered" | "For a 2-person team I'd cut to 6. But each service demonstrates a real production pattern I'd use at your company." |
