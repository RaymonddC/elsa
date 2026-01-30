# AI Log Analysis Agent - Implementation Plan

## Goal
Build a backend-focused AI Agent that analyzes application logs using Elasticsearch, detects incidents, explains root causes, and suggests fixes.

## User Review Required
> [!IMPORTANT]
> **Enhancement Proposal**: I have added a "Glass Box" transparency feature and "Function Calling" for robust query generation. These are critical for a hackathon "wow" factor.

## Proposed Changes

### Project Structure
#### [NEW] [package.json](file:///d:/raymond/Documents/DESKTOP/Projects/elsa/package.json)
- Node.js + TypeScript setup
- Dependencies: `express`, `@elastic/elasticsearch`, `openai`, `zod` (for validation)

#### [NEW] [docker-compose.yml](file:///d:/raymond/Documents/DESKTOP/Projects/elsa/docker-compose.yml)
- Local Elasticsearch + Kibana (optional but good for debugging)
- Eliminates dependency on internet for the demo (safer for hackathons)

### Backend Components
#### [NEW] [src/agent/tools.ts](file:///d:/raymond/Documents/DESKTOP/Projects/elsa/src/agent/tools.ts)
- Define OpenAI Tools (Function Definitions) for:
    - `search_logs(query, time_range)`
    - `aggregate_errors(field, time_range)`
    - `get_error_details(error_code)`

#### [NEW] [src/agent/orchestrator.ts](file:///d:/raymond/Documents/DESKTOP/Projects/elsa/src/agent/orchestrator.ts)
- Main agent loop:
    1. Receive user question
    2. Call LLM with tools
    3. Execute ES queries if tool called
    4. Feed results back to LLM
    5. Generate final explanation

### Data Generation
#### [NEW] [scripts/generate_incident.ts](file:///d:/raymond/Documents/DESKTOP/Projects/elsa/scripts/generate_incident.ts)
- Script to generate a specific "story":
    - 5 mins of normal logs
    - Sudden spike in `DB_TIMEOUT`
    - Cascading 500 errors in `api-service`
    - Recovery

### Frontend (UI)
#### [NEW] [frontend/](file:///d:/raymond/Documents/DESKTOP/Projects/elsa/frontend/)
- **Stack**: React + Vite + Tailwind CSS
- **Components**:
    - `ChatInterface`: Simple input + message history.
    - `GlassBox`: A collapsible/expandable view showing the JSON "thought process" (ES queries, tool outputs) side-by-side with the chat.
    - `LogViewer`: (Optional) Simple table to show raw logs if needed.

## Verification Plan

### Automated Tests
- Unit tests for the Agent tool definitions.
- Integration test: Ingest sample logs -> Ask "What happened?" -> Verify Agent mentions "DB_TIMEOUT".

### Manual Verification
- Run `docker-compose up`
- Run `npm run seed:incident`
- Curl the API: `POST /analyze { "question": "Why are requests failing?" }`
- Check response contains correct root cause.
