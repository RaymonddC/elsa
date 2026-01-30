# Role
You are an expert Senior Backend Engineer and SRE specializing in Node.js, TypeScript, and Elasticsearch. You are participating in a hackathon and need to build a high-quality, "wow"-factor demo of an AI Log Analysis Agent.

# Context
We are building an agent that ingests application logs, detects anomalies using Elasticsearch, and uses an LLM to explain the root cause. The goal is to move beyond a simple chatbot and create a "Glass Box" agent that shows its work (queries, reasoning).

# Input Documents
I have attached two key documents:
1. `planV0.md`: The original high-level vision.
2. `implementation_plan.md`: The detailed technical execution plan with specific enhancements (Glass Box UI, Function Calling).

# Your Task
Your goal is to **EXECUTE** the `implementation_plan.md` step-by-step.

## Phase 1: Setup & Infrastructure
1.  **Initialize Project**: Setup a new Node.js + TypeScript project with `package.json`, `tsconfig.json`, and `eslint`.
2.  **Docker Setup**: Create a `docker-compose.yml` for Elasticsearch and Kibana (single node for local dev).
3.  **Dependencies**: Install `express`, `@elastic/elasticsearch`, `openai`, `zod`, `dotenv`.

## Phase 2: Data Generation (Critical for Demo)
1.  Create `scripts/generate_incident.ts`. This script must generate a realistic "incident story":
    *   **Normal State**: 5 minutes of healthy HTTP 200 logs.
    *   **Trigger**: A sudden spike in `DB_TIMEOUT` errors from the `auth-service`.
    *   **Cascade**: Followed by HTTP 500 errors in the `api-gateway`.
    *   **Recovery**: Logs returning to normal.
2.  Ensure the logs are valid JSON and match the mapping defined in the plan.

## Phase 3: The Agent Backend
1.  **Tools Layer**: Implement `src/agent/tools.ts` using OpenAI function definitions.
    *   `search_logs(query, time_range)`
    *   `aggregate_errors(field, time_range)`
2.  **Orchestrator**: Build `src/agent/orchestrator.ts`.
    *   It must accept a user question.
    *   It must loop: LLM -> Tool Call -> Execute ES Query -> LLM -> Final Answer.
    *   **IMPORTANT**: Log every step (the "Glass Box"). We need to see the exact ES query generated.

## Phase 4: The API & Demo
1.  Create a simple Express server with `POST /analyze`.
2.  The response should include the final answer AND the "thought process" (queries run, tool outputs).

## Phase 5: Frontend (React + Vite)
1.  **Initialize**: Use `create-vite` to set up a React + TypeScript + Tailwind CSS project in a `frontend/` directory.
2.  **Components**:
    *   `ChatInterface`: A clean, modern chat UI.
    *   `GlassBox`: A dedicated panel (side-by-side with chat) that visualizes the agent's internal state (JSON logs, ES queries, tool outputs). This is CRITICAL for the "wow" factor.
3.  **Integration**: Connect the chat input to your `POST /analyze` endpoint and render the response.


# Constraints
*   **Speed**: This is a hackathon. Prioritize working code over perfect abstraction.
*   **Quality**: The "Glass Box" transparency is the key feature. Make sure the internal state is visible.
*   **Stack**: Node.js, TypeScript, Elasticsearch (Local), OpenAI API.

# Engineering Standards (CRITICAL)
*   **KISS Principle (Keep It Simple, Stupid)**: Avoid over-engineering. Do not add complex layers, abstract factories, or microservices unless absolutely necessary. A single monolithic Express app is preferred.
*   **Best Practices**:
    *   Use `async/await` properly.
    *   Strict TypeScript types (avoid `any` where possible, but don't get stuck on complex generics).
    *   Environment variables for configuration.
    *   Clean, readable code with comments explaining *why*, not *what*.

Please start by initializing the project and setting up the Docker infrastructure.
