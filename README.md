# ELSA - AI Log Analysis Agent

An AI-powered log analysis agent with "Glass Box" transparency that shows its reasoning process.

## Features

- **Intelligent Log Analysis**: Uses LLM to analyze application logs and detect anomalies
- **Glass Box UI**: See exactly what queries the agent runs and how it reasons
- **Elasticsearch Backend**: Fast, scalable log storage and search
- **Modern Stack**: Node.js, TypeScript, React, OpenAI

## Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- OpenAI API key

### 2. Setup

```bash
# Install dependencies
npm install

# Copy environment file and add your OpenAI API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start Elasticsearch and Kibana
docker-compose up -d

# Wait for Elasticsearch to be ready (check health)
docker-compose ps
```

### 3. Initialize and Generate Data

```bash
# Initialize the Elasticsearch index
npm run init-index

# Generate sample incident logs
npm run generate-logs
```

### 4. Run the Backend

```bash
# Development mode with hot reload
npm run dev

# Or build and run
npm run build
npm start
```

### 5. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Access the app at `http://localhost:5173`

## Project Structure

```
elsa/
├── src/
│   ├── agent/
│   │   ├── tools.ts         # OpenAI function definitions
│   │   └── orchestrator.ts  # Agent loop with Glass Box logging
│   ├── config/
│   │   └── elasticsearch.ts # ES client setup
│   └── index.ts             # Express server
├── scripts/
│   ├── init_elasticsearch.ts    # Create index with mapping
│   └── generate_incident.ts     # Generate realistic log data
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatInterface.tsx
│       │   └── GlassBox.tsx
│       └── App.tsx
├── docker-compose.yml
└── package.json
```

## Usage

1. Open the web interface
2. Ask questions like:
   - "What errors happened in the last hour?"
   - "Show me all authentication failures"
   - "Are there any anomalies in the logs?"
3. Watch the Glass Box panel to see the agent's reasoning and queries

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **Database**: Elasticsearch 8.11
- **AI**: OpenAI GPT-4
- **Frontend**: React, Vite, Tailwind CSS
- **Validation**: Zod

## License

MIT
