# ELSA Demo Guide - Hackathon Edition

## Quick Start (5 minutes)

### 1. Setup Environment

```bash
# Copy .env file and add your OpenAI API key
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-...

# Start Elasticsearch & Kibana
docker-compose up -d

# Wait 30 seconds for Elasticsearch to be ready
# Check status: docker-compose ps
```

### 2. Backend Setup

```bash
# Install dependencies (already done if you ran npm install)
npm install

# Initialize Elasticsearch index
npm run init-index

# Generate realistic incident logs
npm run generate-logs

# Start backend server
npm run dev
```

Backend will run on `http://localhost:3000`

### 3. Frontend Setup

```bash
# In a new terminal
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173`

## Demo Flow

### The Story

The logs contain a realistic incident:
1. **Normal state** (5 min): Healthy traffic, all services working
2. **Incident trigger** (2 min): Database connection pool exhausted in `auth-service`
3. **Cascade** (3 min): HTTP 500 errors spread to `api-gateway`
4. **Recovery** (3 min): Errors gradually decrease
5. **Normal state** (2 min): System fully recovered

### Demo Questions (Show the Glass Box!)

Ask these questions to showcase the agent:

1. **"What errors happened in the last 15 minutes?"**
   - Shows the agent searching logs
   - Glass Box displays the Elasticsearch query
   - Results show DB_TIMEOUT and HTTP 500 errors

2. **"Which service has the most errors?"**
   - Agent aggregates by service
   - Glass Box shows aggregation query
   - Results reveal auth-service is the culprit

3. **"Show me all database timeout errors"**
   - Targeted search for DB_TIMEOUT
   - Glass Box shows precise query with filters
   - Results show the cascade pattern

4. **"Are there any anomalies in the logs?"**
   - Agent will analyze patterns
   - Shows multiple tool calls in Glass Box
   - Provides root cause analysis

### Key Features to Highlight

#### 1. Glass Box Transparency
- **Left panel**: Natural conversation
- **Right panel**: Agent's internal reasoning
- Shows EXACTLY what queries it runs
- Displays execution times
- Reveals tool arguments and results

#### 2. Function Calling
- Agent uses OpenAI function calling
- Two tools: `search_logs` and `aggregate_errors`
- Dynamically decides which tools to use
- Can make multiple calls to gather info

#### 3. Root Cause Analysis
- Not just a search wrapper
- LLM analyzes patterns and correlations
- Traces cascading errors back to origin
- Provides actionable insights

## Architecture Highlights

### Backend (Node.js + TypeScript)
- **Agent Orchestrator**: Main loop with tool calling
- **Tools Layer**: Elasticsearch query builders
- **Glass Box Logging**: Every step captured
- **Express API**: Simple REST interface

### Frontend (React + Tailwind)
- **ChatInterface**: Clean, modern chat UI
- **GlassBox**: Real-time reasoning visualization
- **Side-by-side layout**: Chat + transparency
- **Type-safe**: Full TypeScript

### Data (Elasticsearch)
- **Realistic logs**: Multi-service, time-series
- **Optimized mapping**: Fast aggregations
- **Single-node setup**: Easy local dev

## Troubleshooting

### Elasticsearch not starting
```bash
docker-compose down
docker-compose up -d
# Wait 30 seconds
curl http://localhost:9200/_cluster/health
```

### Backend errors
```bash
# Check .env has valid OPENAI_API_KEY
# Check Elasticsearch is running
npm run dev
```

### Frontend not connecting
```bash
# Check backend is running on port 3000
# Check frontend/.env has VITE_API_URL=http://localhost:3000
cd frontend && npm run dev
```

### No logs found
```bash
# Re-run log generation
npm run init-index
npm run generate-logs
```

## Why This Demo Stands Out

1. **Glass Box > Black Box**: Most AI demos hide the reasoning. We show it all.
2. **Real incident simulation**: Not random logs - a story with a root cause.
3. **Function calling**: Uses modern LLM capabilities, not just prompting.
4. **Production patterns**: ES queries, TypeScript, proper error handling.
5. **Hackathon speed**: Built in one day, but looks professional.

## Next Steps (Post-Hackathon)

- Add more tools (filter by time range, correlate traces)
- Implement streaming responses
- Add auth and multi-tenancy
- Connect to real log sources (CloudWatch, Datadog)
- Add anomaly detection ML model
- Export analysis as reports

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| AI | OpenAI GPT-4 Turbo |
| Backend | Node.js, TypeScript, Express |
| Database | Elasticsearch 8.11 |
| Frontend | React, Vite, Tailwind CSS |
| Validation | Zod |
| Infra | Docker Compose |

---

Built for the hackathon with passion and coffee.
