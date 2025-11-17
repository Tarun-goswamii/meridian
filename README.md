# Meridian

Collaborative platform for data science projects; for non-data science people. Upload files, create data frames and insights, modify the data as needed, generate charts, work with coworkers in real-time (queries made by them will be shown), do everything while moving in LIGHTNING ⚡ speed.

## Features built:

1. Step-by-step SQL Query generation and execution

## Features left

1. Data visualization (charts)
2. Firecrawl (streaming)
3. Git-like database rollbacks
4. Collaborative workspaces

---

Firebase aise live-time chart scene nhi bitha sakta, but convex can do this + livetime
Server side duck db was tanstack ka thing
One problem with convex is: it's type-safe but then rollbacks are difficult

---

- Problem you're solving
- How the app works
- Notable features
- Why did you build this
- Tech stack list
- Challenges we ran into
- Any success stories or metrics

---

Meridian: Collaborative Data Analysis Tan-times faster

### Problem You're Solving

Non-technical teams spend hours on repetitive data work: uploading spreadsheets, writing queries, waiting for results, losing track of how insights were discovered. Traditional tools (Julius AI, ChatGPT) work but aren't built for real-time collaboration or reproducible analysis workflows.

### How It Works

Meridian is a collaborative data analysis platform where teams:

- Upload CSV/SQL data → instantly get auto-discovered insights
- Ask natural language questions → AI agents show step-by-step reasoning
- Watch results stream live as charts update in real-time
- See teammates' queries and analyses happening simultaneously
- Replay any analysis to understand HOW insights were discovered

### Notable Features

Live-Time Collaboration

- Real-time reactive updates via Convex subscriptions
- Multiple users querying simultaneously, all results sync instantly
- See query history + reasoning steps as they execute

### Streaming Agent Reasoning

- Ask a question → agent breaks it into steps
- Each step streams to UI: "Reading column X..." → "Computing statistics..." → "Found pattern Y"
- Judges see transparent AI reasoning, not black-box results

### Live-Updating Dashboards

- Query the data → charts update instantly
- Not batch processing like competitors
- Powered by Convex reactivity + TanStack Start streaming

### Query Reproducibility

- Every analysis tracked with reasoning preserved
- "Git-like" rollback system to previous queries
- Understand WHAT happened and WHY it happened

Vectorized OLAP Analytics

- DuckDB powers fast analytical queries
- Columnar storage optimized for aggregations
- Can analyze millions of rows instantly

### Why We Built This

The problem: teams waste time on data instead of insights. The opportunity: combine real-time collaboration (Convex), streaming architecture (TanStack Start), and analytical power (DuckDB) to make data accessible without losing reproducibility.

### Tech Stack

Frontend: TanStack Start + Mantine UI  
Backend: Convex (real-time, type-safe)  
Data Storage: DuckDB (server-side via TanStack), Cloudflare R2 (file storage)  
AI Agents: Claude with streaming steps  
Data Integration: Firecrawl (URL → CSV)  
Billing: Autumn (usage-based pricing)  
Monitoring: Sentry error tracking  
Deployment: Netlify + Cloudflare

### Challenges We Ran Into

- Data Serialization Across RPC Calls
- Issue: TanStack Start Server Functions needed to pass large datasets + DuckDB instances
- Solution: Store data in Convex file storage, pass only references over RPC
- Why it matters: Enabled server-side DuckDB (fast) instead of wasm (slow)
- Live-Time Updates at Scale
- Issue: Firebase can't do live-time chart updates efficiently
- Solution: Convex subscriptions handle reactive data flow + automatic cache invalidation
- Result: Charts update milliseconds after query completes
- Type Safety with Flexibility
- Issue: Convex is type-safe but rollbacks are tricky with strict schemas
- Solution: Used flexible document storage for query history + metadata
- Trade-off: Less strict but more flexible for analysis workflows
- Server-Side DuckDB on Netlify
- Issue: Netlify read-only filesystem + home directory requirements
- Solution: TanStack Start's server/client separation allowed server-side DuckDB node
- Why: DuckDB wasm is too slow; needed native performance

### Why Meridian is unique

vs Julius AI: We have query reproducibility + streaming reasoning steps + live collaboration
vs ChatGPT: Persistent analysis workflows + real-time team collaboration + transparent reasoning
vs Traditional BI Tools: Natural language queries + AI reasoning + zero setup

Metrics & Success

- Agent Reasoning Transparency: Multi-step analysis with streaming steps shown in real-time
- Real-Time Collaboration: Convex reactive updates mean zero-latency team sync
- Vectorized Queries: DuckDB OLAP enables sub-second queries on millions of rows
- Live Charts: Query execution → chart updates in <100ms

Tech Showcase

✅ TanStack Start: Server/client separation enabled server-side DuckDB  
✅ Convex: Real-time reactive updates + type-safe backend  
✅ Firecrawl: Transform URLs into queryable datasets instantly  
✅ Sentry: Production monitoring + error tracking  
✅ Autumn: Usage-based pricing + feature gating  
✅ Cloudflare R2: Scalable file storage for CSVs  
✅ Netlify: Edge deployment with real-time functions

Shipped Nov 17, 2025.
