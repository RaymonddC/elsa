/**
 * Express API Server for ELSA Crypto Wallet Analyzer
 *
 * Endpoints:
 * - POST /analyze - Analyze a user question about a Bitcoin or Ethereum wallet
 * - GET /health - Health check
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeQuestion, type StepEvent } from './agent/orchestrator';
import { testConnection, esClient, WALLET_TX_INDEX } from './config/elasticsearch';
import { z } from 'zod';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chats';
import { requireAuth, type AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Auth routes (public)
app.use(authRoutes);

// Chat history routes (protected)
app.use(chatRoutes);

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const esConnected = await testConnection();

    res.json({
      status: 'ok',
      elasticsearch: esConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Wallet activity endpoint - daily transaction counts for charts
app.get('/wallet-activity/:address', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { address } = req.params;

    const isEth = address.startsWith('0x');
    const valueField = isEth ? 'value_eth' : 'value_btc';

    const response = await esClient.search({
      index: WALLET_TX_INDEX,
      body: {
        query: { term: { address } },
        size: 0,
        aggs: {
          daily: {
            date_histogram: {
              field: 'time_iso',
              calendar_interval: 'day',
            },
            aggs: {
              incoming: { filter: { term: { direction: 'incoming' } } },
              outgoing: { filter: { term: { direction: 'outgoing' } } },
              value_in: {
                filter: { term: { direction: 'incoming' } },
                aggs: { sum: { sum: { field: valueField } } },
              },
              value_out: {
                filter: { term: { direction: 'outgoing' } },
                aggs: { sum: { sum: { field: valueField } } },
              },
              ...(isEth ? {
                token_value_in: {
                  filter: { bool: { must: [{ term: { direction: 'incoming' } }, { term: { is_token_transfer: true } }] } },
                  aggs: { sum: { sum: { field: 'token_value' } } },
                },
                token_value_out: {
                  filter: { bool: { must: [{ term: { direction: 'outgoing' } }, { term: { is_token_transfer: true } }] } },
                  aggs: { sum: { sum: { field: 'token_value' } } },
                },
                top_token: {
                  terms: { field: 'token_symbol.keyword', size: 1 },
                },
              } : {}),
            },
          },
        },
      },
    });

    const buckets = (response.aggregations?.daily as any)?.buckets || [];
    const activity = buckets.map((b: any) => ({
      date: b.key_as_string,
      total: b.doc_count,
      incoming: b.incoming.doc_count,
      outgoing: b.outgoing.doc_count,
      value_in: b.value_in?.sum?.value || 0,
      value_out: b.value_out?.sum?.value || 0,
      token_value_in: b.token_value_in?.sum?.value || 0,
      token_value_out: b.token_value_out?.sum?.value || 0,
      top_token: b.top_token?.buckets?.[0]?.key || null,
    }));

    res.json({ address, chain: isEth ? 'ethereum' : 'bitcoin', activity });
  } catch (error) {
    console.error('Error in /wallet-activity:', error);
    res.status(500).json({ error: 'Failed to fetch wallet activity' });
  }
});

// Analyze endpoint - The main API
const AnalyzeRequestSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
});

app.post('/analyze', requireAuth, async (req: AuthRequest, res) => {
  try {
    // Validate request
    const { question } = AnalyzeRequestSchema.parse(req.body);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`User: ${req.user?.email}`);
    console.log(`Question: ${question}`);
    console.log('='.repeat(80));

    // Run the agent
    const response = await analyzeQuestion(question);

    console.log(`\nAgent finished in ${response.total_duration_ms}ms`);
    console.log(`Success: ${response.success}`);
    console.log('='.repeat(80));

    // Return the full Glass Box response
    res.json(response);
  } catch (error) {
    console.error('Error in /analyze:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

// SSE streaming analyze endpoint
app.post('/analyze-stream', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { question } = AnalyzeRequestSchema.parse(req.body);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event: StepEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const response = await analyzeQuestion(question, sendEvent);

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'result', ...response })}\n\n`);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.end();
    }
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// Start server
async function start() {
  try {
    // Test Elasticsearch connection
    console.log('Testing Elasticsearch connection...');
    const esConnected = await testConnection();

    if (!esConnected) {
      console.error('WARNING: Elasticsearch is not connected!');
      console.error('Make sure Docker Compose is running: docker-compose up -d');
    }

    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`ELSA Bitcoin & Ethereum Wallet Analyzer API`);
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Elasticsearch: ${esConnected ? '✓ Connected' : '✗ Disconnected'}`);
      console.log('='.repeat(80));
      console.log('\nReady to analyze wallets!\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
