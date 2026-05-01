# ELSA — AI Wallet Analyzer with Glass Box Reasoning

A multi-chain (Bitcoin + Ethereum) wallet analysis platform powered by an OpenAI function-calling agent. Every query the agent runs and every decision it makes is exposed in a "Glass Box" reasoning panel, so users can see the chain of evidence behind each finding.

**Live demo:** https://project-30dd0d97-4e23-4201-ac7.web.app

## What it does

Ask natural-language questions about any Bitcoin or Ethereum wallet:

- "What's this wallet's balance and recent activity?"
- "Show me all incoming transactions over 1 ETH in the last 30 days."
- "Are there any anomalies in this address's transaction history?"
- "Break down ERC-20 token holdings with USD valuations."

The agent fetches on-chain data, caches it in Elasticsearch for fast filtered search, and runs custom anomaly detection — surfacing outliers, mixing patterns, and dormant-wallet reactivation.

## How it works

ELSA is a real OpenAI **function-calling agent loop**, not a single-shot prompt. The agent has access to four tools and chooses which to call (and in what order) based on the user's question.

### Tools

| Tool | What it does |
|------|--------------|
| `fetch_wallet_data` | Calls blockchain.com (BTC) or Etherscan (ETH) APIs, normalizes transactions to a common schema, and indexes them in Elasticsearch. For Ethereum, also fetches ERC-20 transfers and pulls USD pricing per token. |
| `search_transactions` | Elasticsearch-backed filtered query: direction, value range, time range, sort order. |
| `get_wallet_summary` | Returns the cached summary (balance, totals, first/last seen, per-token breakdown). |
| `detect_anomalies` | Runs custom statistical detection (see below) at low/medium/high sensitivity. |

### Anomaly detection

The detection logic is hand-coded, not LLM-based — keeping it deterministic and auditable:

- **Large transactions** — values beyond N standard deviations from the wallet's mean
- **Rapid sequences** — clusters of 3+ transactions within a short window (potential mixing or automation)
- **Round-number transactions** — possible structured payments
- **Dormant reactivation** — wallet inactive for 90+ days, then suddenly active
- **Fan-out / fan-in (Bitcoin)** — high-output or high-input transactions, common in mixing or consolidation
- **Failed transactions (Ethereum)** — `isError === '1'` patterns
- **Gas price spikes (Ethereum)** — gas price 3× above wallet average

### Glass Box reasoning UI

The frontend's `ReasoningPanel.tsx` streams the agent's tool calls in real time, showing the exact Elasticsearch query, the input parameters, the execution time, and the raw output. Users can audit how a conclusion was reached, not just trust it.

## Tech stack

**Backend**
- Node.js + TypeScript + Express
- OpenAI SDK (function calling)
- Elasticsearch 8.11 (transaction cache + summary index)
- Zod for request/response validation
- Google OAuth (`google-auth-library`) + JWT auth
- Persisted chat history

**Frontend**
- React 18 + Vite + Tailwind CSS
- Components: `ChatPanel`, `ChatSidebar`, `ReasoningPanel`, `WalletDashboardCard`, `TransactionChart`, `TokenActivity`

**Infrastructure**
- Firebase Hosting (frontend)
- Docker + `docker-compose.prod.yml` (backend)
- GitHub Actions: `deploy-frontend.yml`, `deploy-backend.yml`

## Project structure

```
elsa/
├── src/                          # Backend
│   ├── agent/
│   │   ├── orchestrator.ts       # Agent loop with Glass Box logging
│   │   └── tools.ts              # OpenAI function definitions + executors
│   ├── services/
│   │   ├── blockchain.ts         # blockchain.com API client (BTC)
│   │   ├── etherscan.ts          # Etherscan API client (ETH + ERC-20)
│   │   ├── auth.ts               # Google OAuth verification
│   │   └── chatHistory.ts        # Chat persistence
│   ├── routes/                   # auth.ts, chats.ts
│   ├── config/elasticsearch.ts   # ES client + index names
│   └── index.ts                  # Express server entry
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatPanel.tsx
│       │   ├── ReasoningPanel.tsx     # The "Glass Box"
│       │   ├── WalletDashboardCard.tsx
│       │   ├── TransactionChart.tsx
│       │   └── TokenActivity.tsx
│       ├── contexts/
│       └── App.tsx
├── docker-compose.yml            # Local dev (ES + Kibana)
├── docker-compose.prod.yml       # Production backend
├── firebase.json                 # Firebase Hosting config
└── .github/workflows/            # CI/CD
```

## Running locally

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- An OpenAI API key
- An Etherscan API key (free tier is fine)

### Setup

```bash
# 1. Install dependencies
npm install
cd frontend && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Edit .env: OPENAI_API_KEY, ETHERSCAN_API_KEY, GOOGLE_CLIENT_ID, JWT_SECRET

# 3. Start Elasticsearch (and Kibana for debugging)
docker-compose up -d

# 4. Initialize the indices
npm run init-index

# 5. Run backend + frontend together
npm run dev
```

The frontend is served at `http://localhost:5173`, backend at `http://localhost:3000`.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/google` | Verify a Google ID token, issue a JWT |
| `GET`  | `/chats` | List the user's chat history |
| `POST` | `/chats/:id/messages` | Send a message to the agent and stream tool calls back |

## Notes

- Anomaly thresholds are configurable per request (`low` / `medium` / `high` sensitivity), letting users trade false positives against missed signals.
- The backend deletes and re-indexes a wallet's transactions on each fetch — keeping the cache consistent with chain state without requiring deduplication logic.
- All numeric outputs are sanitized through `safeFloat`/`sanitizeObject` to handle `Infinity`/`NaN` cleanly before they reach Elasticsearch (which rejects them).

## License

MIT
