/**
 * Express API Server for ELSA Log Analysis Agent
 *
 * Endpoints:
 * - POST /analyze - Analyze a user question about logs
 * - GET /health - Health check
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeQuestion } from './agent/orchestrator';
import { testConnection } from './config/elasticsearch';
import { z } from 'zod';

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

// Analyze endpoint - The main API
const AnalyzeRequestSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
});

app.post('/analyze', async (req, res) => {
  try {
    // Validate request
    const { question } = AnalyzeRequestSchema.parse(req.body);

    console.log(`\n${'='.repeat(80)}`);
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
      console.log(`ELSA Log Analysis Agent API`);
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Elasticsearch: ${esConnected ? '✓ Connected' : '✗ Disconnected'}`);
      console.log('='.repeat(80));
      console.log('\nReady to analyze logs!\n');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
