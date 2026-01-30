# AI Log Analysis Agent (Elasticsearch) – Build Plan for Claude Code

> **Goal**: Build a backend-focused AI Agent that analyzes application logs using Elasticsearch, detects incidents, explains root causes, and suggests fixes.
>
> **Audience**: Backend engineers / SREs
>
> **Core idea**: Elasticsearch does search + analytics. LLM explains and decides next steps.

---

## 1. Project Overview

We are building an **AI Log Analysis Agent** that:

* Ingests structured application logs (JSON)
* Indexes them into Elasticsearch
* Detects error spikes and anomalies
* Uses an LLM-based agent to:

  * Explain what happened
  * Identify likely root causes
  * Suggest next actions

This is **NOT a chatbot**. It is a **multi-step agent**.

---

## 2. High-Level Architecture

```
User
 ↓
API (Node.js)
 ↓
Agent Orchestrator
 ↓                ↘
Elasticsearch      LLM
(search + aggs)    (reasoning + explanation)
```

---

## 3. Tech Stack (Locked)

* **Backend**: Node.js + TypeScript
* **Framework**: Express (simple)
* **Search Engine**: Elasticsearch (Elastic Cloud – free trial)
* **LLM**: OpenAI-compatible API (minimal usage)
* **Data**: Generated sample logs (JSON)

---

## 4. Data Model (Elasticsearch Index)

### Index Name

`app-logs`

### Mapping

```json
{
  "mappings": {
    "properties": {
      "timestamp": { "type": "date" },
      "level": { "type": "keyword" },
      "service": { "type": "keyword" },
      "message": { "type": "text" },
      "error_code": { "type": "keyword" },
      "stack_trace": { "type": "text" },
      "host": { "type": "keyword" }
    }
  }
}
```

---

## 5. Sample Log Format

```json
{
  "timestamp": "2025-01-10T10:23:45Z",
  "level": "ERROR",
  "service": "auth-service",
  "message": "Database connection timeout",
  "error_code": "DB_TIMEOUT",
  "stack_trace": "Error: timeout at db.js:45",
  "host": "api-1"
}
```

Logs will be **generated locally** and bulk indexed.

---

## 6. Agent Responsibilities

The agent must:

1. Understand the user question
2. Decide which Elasticsearch queries to run
3. Analyze results
4. Generate a human-readable explanation
5. Suggest next actions

---

## 7. Agent Decision Flow (Core Logic)

```
User Question
 ↓
LLM: classify intent
 ↓
If intent = "incident analysis":
  → Query error logs
  → Aggregate by error_code
  → Detect spikes
  → Fetch related stack traces
  → Summarize root cause
```

---

## 8. Elasticsearch Queries Used

### Error Spike Detection

```json
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "level": "ERROR" } },
        { "range": { "timestamp": { "gte": "now-24h" } } }
      ]
    }
  },
  "aggs": {
    "errors_by_type": {
      "terms": { "field": "error_code" }
    }
  }
}
```

---

## 9. LLM Usage (Minimal & Controlled)

### LLM is used ONLY for:

* Intent classification
* Explanation generation
* Recommendation text

### Example Prompt

```text
You are an SRE assistant.
Given the following error statistics and sample logs, explain:
1. What happened
2. Likely root cause
3. Suggested fix

Data:
{{ELASTICSEARCH_RESULTS}}
```

---

## 10. API Endpoints

### POST /analyze

**Input**

```json
{
  "question": "Why is my API failing today?"
}
```

**Output**

```json
{
  "summary": "Auth service experienced DB timeouts",
  "root_cause": "Connection pool exhaustion",
  "recommendation": "Increase pool size or check DB latency"
}
```

---

## 11. Demo Flow (Hackathon-Ready)

1. Show logs indexed in Elasticsearch
2. Ask a natural language question
3. Show Elasticsearch query execution
4. Show agent explanation

Demo time: **< 5 minutes**

---

## 12. Build Steps (Execution Plan)

### Day 1

* Setup Elasticsearch
* Create index + mapping

### Day 2

* Generate sample logs
* Bulk ingest logs

### Day 3

* Implement Elasticsearch queries
* Validate aggregations

### Day 4

* Add LLM reasoning layer
* Implement agent flow

### Day 5

* Polish responses
* Record demo video

---

## 13. Success Criteria (Judge View)

* Clear use of Elasticsearch search + aggregations
* Agent performs multiple steps
* Output is actionable
* System is simple and understandable

---

## 14. Non-Goals (Important)

* No real-time streaming
* No production scaling
* No authentication
* No fancy UI

---

## 15. Final Principle

> Elasticsearch finds the signal.
> The agent explains the signal.

This is a **backend-first, agent-driven system**, not a chatbot.
