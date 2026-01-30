# ELSA Architecture

## System Overview

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Browser   │─────▶│  Express API │─────▶│ Orchestrator │
│  (React UI) │◀─────│   (REST)     │◀─────│   (Agent)    │
└─────────────┘      └──────────────┘      └──────┬───────┘
                                                   │
                                                   ▼
                                            ┌──────────────┐
                                            │    Tools     │
                                            │   Layer      │
                                            └──────┬───────┘
                                                   │
                                                   ▼
                     ┌─────────────────────────────────────┐
                     │                                     │
                     ▼                                     ▼
              ┌──────────────┐                    ┌──────────────┐
              │ Elasticsearch│                    │   OpenAI     │
              │  (Log Store) │                    │   GPT-4      │
              └──────────────┘                    └──────────────┘
```

## Component Details

### 1. Frontend (React + Vite)

**Location**: `frontend/`

**Purpose**: Dual-pane UI with chat and Glass Box transparency

**Key Files**:
- `src/App.tsx`: Main app container, manages state and API calls
- `src/components/ChatInterface.tsx`: Left panel - conversation UI
- `src/components/GlassBox.tsx`: Right panel - reasoning visualization
- `src/types/agent.ts`: TypeScript interfaces for agent responses

**Flow**:
1. User types question
2. Send POST to `/analyze`
3. Receive `AgentResponse` with full reasoning trace
4. Update both chat and Glass Box simultaneously

### 2. Backend API (Express)

**Location**: `src/index.ts`

**Purpose**: Simple REST API to expose agent functionality

**Endpoints**:
- `GET /health`: Health check (ES connection status)
- `POST /analyze`: Main endpoint - analyze a question

**Request**:
```json
{
  "question": "What errors happened in the last hour?"
}
```

**Response**:
```json
{
  "question": "...",
  "final_answer": "...",
  "reasoning_steps": [...],
  "total_duration_ms": 1234,
  "success": true
}
```

### 3. Agent Orchestrator

**Location**: `src/agent/orchestrator.ts`

**Purpose**: Core agent loop - the "brain"

**Algorithm**:
```
1. Initialize conversation with system prompt
2. Add user question
3. Loop (max 10 iterations):
   a. Call LLM with tools available
   b. If LLM returns tool calls:
      - Execute each tool
      - Log to reasoning_steps (Glass Box!)
      - Send results back to LLM
   c. If LLM returns text:
      - This is the final answer
      - Break loop
4. Return AgentResponse with full trace
```

**Glass Box Implementation**:
- Every step logged to `reasoning_steps` array
- Includes: tool calls, arguments, ES queries, results, timings
- Frontend renders this array for transparency

### 4. Tools Layer

**Location**: `src/agent/tools.ts`

**Purpose**: Functions the LLM can call

**Tools**:

#### `search_logs(query, time_range?, service?, level?, limit?)`
- Searches logs with filters
- Returns matching log entries
- Exposes: Elasticsearch DSL query for Glass Box

#### `aggregate_errors(field, time_range?, top_n?)`
- Aggregates errors by field (error_type, service, http_status)
- Returns top N with counts
- Exposes: Elasticsearch aggregation query

**OpenAI Function Format**:
```typescript
{
  type: 'function',
  function: {
    name: 'search_logs',
    description: '...',
    parameters: { ... } // JSON Schema
  }
}
```

### 5. Elasticsearch

**Location**: Docker container

**Index**: `application-logs`

**Mapping**:
```
{
  timestamp: date,
  level: keyword,
  service: keyword,
  message: text,
  error_type: keyword,
  http_status: integer,
  ...
}
```

**Query Types**:
- Full-text search: `query_string` on message/error fields
- Filtering: `term` queries on keywords
- Aggregations: `terms` on error_type, service
- Time range: `range` on timestamp

## Data Flow: User Question → Answer

```
User: "What errors happened in the last 15 minutes?"
  ↓
Frontend: POST /analyze { question: "..." }
  ↓
Orchestrator: Initialize conversation
  ↓
OpenAI: Decides to use search_logs tool
  ↓
Tools: Build ES query:
  {
    query: {
      bool: {
        must: [
          { query_string: { query: "error OR ERROR" } },
          { term: { level: "ERROR" } },
          { range: { timestamp: { gte: "...", lte: "..." } } }
        ]
      }
    }
  }
  ↓
Elasticsearch: Returns 47 error logs
  ↓
Tools: Return { results: [...], elasticsearch_query: {...} }
  ↓
Orchestrator: Log to reasoning_steps (Glass Box!)
  ↓
Orchestrator: Send results to OpenAI
  ↓
OpenAI: Decides to aggregate by error_type
  ↓
Tools: Build ES aggregation query:
  {
    query: { ... },
    aggs: {
      grouped: {
        terms: { field: "error_type", size: 10 }
      }
    }
  }
  ↓
Elasticsearch: Returns { DB_TIMEOUT: 32, AUTH_SERVICE_TIMEOUT: 15 }
  ↓
Tools: Return aggregations
  ↓
Orchestrator: Log to reasoning_steps
  ↓
OpenAI: Generates final answer:
  "In the last 15 minutes, there were 47 errors.
   The main issues were:
   - 32 DB_TIMEOUT errors in auth-service
   - 15 AUTH_SERVICE_TIMEOUT errors in api-gateway
   This indicates a database connection pool exhaustion
   that cascaded to the API gateway."
  ↓
Orchestrator: Return AgentResponse with:
  - final_answer
  - reasoning_steps (2 steps, each with tool call + result)
  - total_duration_ms
  ↓
Frontend: Display answer in chat + reasoning in Glass Box
```

## Key Design Decisions

### 1. Why OpenAI Function Calling?
- **Structured**: JSON schemas enforce correct parameters
- **Dynamic**: LLM decides which tools to use
- **Composable**: Can chain multiple tool calls
- **Standard**: Well-supported pattern

### 2. Why Elasticsearch?
- **Fast**: Optimized for log search and aggregations
- **Scalable**: Handles millions of logs
- **Flexible**: Rich DSL for complex queries
- **Industry standard**: Used in production

### 3. Why Glass Box?
- **Trust**: Users see exactly what the agent does
- **Debug**: Easy to spot wrong queries
- **Educational**: Learn how agents work
- **Differentiation**: Most demos are black boxes

### 4. Why Side-by-Side UI?
- **Comparison**: See answer and reasoning together
- **Real-time**: Updates as agent works
- **Clear**: Separate concerns (chat vs. transparency)

### 5. KISS Principle
- **Single monolith**: No microservices
- **Direct Elasticsearch**: No abstraction layers
- **Simple REST**: No GraphQL/gRPC
- **No ORM**: Direct ES client
- **Hackathon speed**: Working code over perfect architecture

## Scalability Considerations

### Current Limitations (Hackathon MVP)
- Single-node Elasticsearch
- No authentication
- No rate limiting
- No caching
- Synchronous processing

### Production Path
1. **Multi-node ES cluster**: Sharding and replication
2. **Auth**: JWT tokens, API keys
3. **Rate limiting**: Redis-backed limits
4. **Caching**: LRU cache for common queries
5. **Async processing**: Queue for long-running analysis
6. **Streaming**: SSE for real-time updates
7. **Multi-tenancy**: Index per tenant
8. **Observability**: Logs, metrics, traces

## Security Considerations

### Current Setup (Local Dev)
- No authentication
- CORS wide open
- API keys in .env

### Production Requirements
- ES with authentication enabled
- HTTPS everywhere
- API key rotation
- Input validation (already using Zod)
- Rate limiting per user
- Audit logs
- No raw ES query exposure to users

## Performance

### Typical Query Times
- Search logs: 50-200ms
- Aggregate errors: 100-300ms
- LLM call: 1-3s
- Total end-to-end: 2-5s

### Optimization Opportunities
- ES query caching
- LLM response streaming
- Batch tool calls
- Smaller LLM for simple queries
- Pre-computed aggregations

---

This architecture prioritizes:
1. **Hackathon speed**: Working demo in one day
2. **Demo impact**: Glass Box transparency
3. **Code quality**: TypeScript, proper error handling
4. **Real-world patterns**: Industry-standard tools
