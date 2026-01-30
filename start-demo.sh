#!/bin/bash

# ELSA Demo Startup Script

set -e

echo "=================================="
echo "  ELSA Log Analysis Agent Demo"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please copy .env.example to .env and add your OPENAI_API_KEY"
    exit 1
fi

# Check if OPENAI_API_KEY is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo -e "${YELLOW}Warning: OPENAI_API_KEY not set in .env${NC}"
    echo "Please add your OpenAI API key to the .env file"
    exit 1
fi

echo "Step 1: Starting Elasticsearch and Kibana..."
docker-compose up -d

echo ""
echo "Step 2: Waiting for Elasticsearch to be ready (30 seconds)..."
sleep 30

echo ""
echo "Step 3: Checking Elasticsearch health..."
if curl -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Elasticsearch is ready${NC}"
else
    echo -e "${RED}✗ Elasticsearch is not responding${NC}"
    echo "Try running: docker-compose logs elasticsearch"
    exit 1
fi

echo ""
echo "Step 4: Initializing Elasticsearch index..."
npm run init-index

echo ""
echo "Step 5: Generating incident logs..."
npm run generate-logs

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "=================================="
echo "  Next Steps:"
echo "=================================="
echo ""
echo "1. Start the backend:"
echo "   npm run dev"
echo ""
echo "2. In a new terminal, start the frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:5173"
echo ""
echo "=================================="
echo "  Demo Questions to Try:"
echo "=================================="
echo ""
echo '- "What errors happened in the last 15 minutes?"'
echo '- "Which service has the most errors?"'
echo '- "Show me all database timeout errors"'
echo '- "Are there any anomalies in the logs?"'
echo ""
echo "Watch the Glass Box panel on the right to see the agent's reasoning!"
echo ""
