# Meridian

Collaborative Data Analysis Tan-times faster

### Problem You're Solving

Non-technical teams spend hours on repetitive data work: uploading spreadsheets, writing queries, waiting for results, losing track of how insights were discovered. Traditional tools (Julius AI, ChatGPT) work but aren't built for real-time collaboration or reproducible analysis workflows.

### How It Works

Meridian is a collaborative data analysis platform where teams:

- Upload CSV/SQL data → instantly get auto-discovered insights
- Ask natural language questions → AI agents show step-by-step reasoning
- Watch results stream live as charts update in real-time
- See teammates' queries and analyses happening simultaneously
- Replay any analysis to understand HOW insights were discovered
- Make charts with AI and see them update live-time as data is being operated on

### Notable Features

##### Live-Time Collaboration

- Real-time reactive updates via Convex subscriptions
- Multiple users querying simultaneously, all results sync instantly
- See query history + reasoning steps as they execute

##### Streaming Agent Reasoning

- Ask a question → agent breaks it into steps
- Each step streams to UI: "Reading column X..." → "Computing statistics..." → "Found pattern Y"
- Judges see transparent AI reasoning, not black-box results

##### Live-Updating tables

- Query/Mutate the data → charts update instantly
- Not batch processing like competitors
- Powered by Convex reactivity + TanStack Start streaming

##### Query Reproducibility

- Every analysis tracked with reasoning preserved
- Rollback system to previous queries
- Understand WHAT happened and WHY it happened
- Coming Soon: Git-like branching of data and merging

##### Vectorized OLAP Analytics

- DuckDB powers fast analytical queries
- Columnar storage optimized for aggregations
- Can analyze millions of rows instantly

### Why I Built This

The problem: teams waste time on data instead of insights. The opportunity: combine real-time collaboration (Convex), streaming architecture (TanStack Start), and analytical power (DuckDB) to make data accessible without losing reproducibility.

### Tech Stack

Frontend: TanStack Start + Mantine UI -- Helped me use DuckDB NODE instead of WASM, which made the app much faster and easier to use; Also used Tanstack Query and Table
Backend: Convex (real-time, type-safe)  
Data Storage: DuckDB (server-side via TanStack), Cloudflare R2 (file storage)  
AI Agents: Gemini + Convex Agent Component with streaming steps  
Data Integration: Firecrawl (URL → CSV)  
Billing: Autumn (usage-based pricing)  
Monitoring: Sentry error tracking + CodeRabbit reviews before commits
Deployment: Netlify

### Challenges We Ran Into

- Data Serialization Across RPC Calls
  - Issue: TanStack Start Server Functions needed to pass large datasets + DuckDB instances
  - Solution: Store data in Cloudflare R2/MotherDuck file storage, pass only references over RPC
  - Why it matters: Enabled server-side DuckDB (fast) instead of wasm (slow)
- Live-Time Updates at Scale
  - Issue: Firebase can't do live-time chart updates efficiently
  - Solution: Convex subscriptions handle reactive data flow + automatic cache invalidation
  - Result: Charts update milliseconds after query completes
- Server-Side DuckDB on Netlify
  - Issue: Netlify read-only filesystem + home directory requirements
  - Solution: TanStack Start's server/client separation allowed server-side DuckDB node
  - Why: DuckDB wasm is too slow; needed native performance

##### Why Meridian is unique

vs Julius AI: We have query reproducibility + streaming reasoning steps + live collaboration
vs ChatGPT: Persistent analysis workflows + real-time team collaboration + transparent reasoning
vs Traditional BI Tools: Natural language queries + AI reasoning + zero setup

Shipped Nov 17, 2025.
