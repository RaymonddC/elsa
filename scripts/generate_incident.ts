/**
 * Generate realistic incident logs for demo
 *
 * Story:
 * 1. Normal State (5 min): Healthy traffic, HTTP 200s
 * 2. Trigger (2 min): Database connection pool exhausted, DB_TIMEOUT errors in auth-service
 * 3. Cascade (3 min): HTTP 500s in api-gateway due to auth failures
 * 4. Recovery (3 min): Database pool restored, errors decrease
 * 5. Normal State (2 min): Back to healthy
 */

import { esClient, LOG_INDEX } from '../src/config/elasticsearch';
import { LogEntry } from '../src/types/log';

const SERVICES = ['api-gateway', 'auth-service', 'user-service', 'payment-service', 'notification-service'];
const USERS = ['user_123', 'user_456', 'user_789', 'user_101', 'user_202'];
const ENDPOINTS = ['/api/login', '/api/users', '/api/payments', '/api/notifications', '/api/health'];

// Helper: Generate random trace ID
function generateTraceId(): string {
  return `trace_${Math.random().toString(36).substring(2, 15)}`;
}

// Helper: Generate random user ID
function randomUser(): string {
  return USERS[Math.floor(Math.random() * USERS.length)];
}

// Helper: Generate normal healthy log
function generateHealthyLog(timestamp: Date, service: string): LogEntry {
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const duration = Math.floor(Math.random() * 200) + 50; // 50-250ms

  return {
    timestamp: timestamp.toISOString(),
    level: 'INFO',
    service,
    message: `Successful request to ${endpoint}`,
    trace_id: generateTraceId(),
    user_id: randomUser(),
    http_status: 200,
    http_method: 'GET',
    endpoint,
    duration_ms: duration,
  };
}

// Helper: Generate DB_TIMEOUT error in auth-service
function generateDbTimeoutError(timestamp: Date): LogEntry {
  return {
    timestamp: timestamp.toISOString(),
    level: 'ERROR',
    service: 'auth-service',
    message: 'Database connection timeout - connection pool exhausted',
    trace_id: generateTraceId(),
    user_id: randomUser(),
    error_type: 'DB_TIMEOUT',
    error_stack: 'Error: Connection timeout\n  at ConnectionPool.acquire (pool.js:142)\n  at AuthService.validateToken (auth.js:67)',
    duration_ms: 5000, // Long timeout
    metadata: {
      pool_size: 10,
      active_connections: 10,
      waiting_requests: 15,
    },
  };
}

// Helper: Generate HTTP 500 in api-gateway due to auth failure
function generateGateway500Error(timestamp: Date): LogEntry {
  return {
    timestamp: timestamp.toISOString(),
    level: 'ERROR',
    service: 'api-gateway',
    message: 'Internal Server Error - authentication service unavailable',
    trace_id: generateTraceId(),
    user_id: randomUser(),
    http_status: 500,
    http_method: 'GET',
    endpoint: '/api/users',
    error_type: 'AUTH_SERVICE_TIMEOUT',
    error_stack: 'Error: Auth service timeout\n  at Gateway.authenticate (gateway.js:89)\n  at Gateway.handleRequest (gateway.js:45)',
    duration_ms: 5100,
    metadata: {
      upstream_service: 'auth-service',
      retry_attempts: 3,
    },
  };
}

// Helper: Generate recovery log (errors decreasing)
function generateRecoveryLog(timestamp: Date, successRate: number): LogEntry {
  const isSuccess = Math.random() < successRate;

  if (isSuccess) {
    return generateHealthyLog(timestamp, SERVICES[Math.floor(Math.random() * SERVICES.length)]);
  } else {
    // Occasional error during recovery
    return Math.random() < 0.5 ? generateDbTimeoutError(timestamp) : generateGateway500Error(timestamp);
  }
}

async function generateLogs() {
  const logs: LogEntry[] = [];
  const startTime = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

  console.log('Generating incident logs...\n');

  // Phase 1: Normal State (5 minutes)
  console.log('Phase 1: Normal state (5 min)...');
  for (let i = 0; i < 5 * 60; i += 2) { // Every 2 seconds
    const timestamp = new Date(startTime.getTime() + i * 1000);
    for (const service of SERVICES) {
      logs.push(generateHealthyLog(timestamp, service));
    }
  }

  // Phase 2: Trigger - DB_TIMEOUT errors (2 minutes)
  console.log('Phase 2: DB_TIMEOUT errors triggered (2 min)...');
  const triggerStart = 5 * 60;
  for (let i = 0; i < 2 * 60; i += 2) {
    const timestamp = new Date(startTime.getTime() + (triggerStart + i) * 1000);

    // auth-service starts failing with DB_TIMEOUT
    if (Math.random() < 0.7) { // 70% error rate
      logs.push(generateDbTimeoutError(timestamp));
    } else {
      logs.push(generateHealthyLog(timestamp, 'auth-service'));
    }

    // Other services still healthy
    for (const service of SERVICES.filter(s => s !== 'auth-service')) {
      logs.push(generateHealthyLog(timestamp, service));
    }
  }

  // Phase 3: Cascade - HTTP 500s in api-gateway (3 minutes)
  console.log('Phase 3: Cascade - HTTP 500s in api-gateway (3 min)...');
  const cascadeStart = triggerStart + 2 * 60;
  for (let i = 0; i < 3 * 60; i += 2) {
    const timestamp = new Date(startTime.getTime() + (cascadeStart + i) * 1000);

    // auth-service still failing
    if (Math.random() < 0.8) {
      logs.push(generateDbTimeoutError(timestamp));
    } else {
      logs.push(generateHealthyLog(timestamp, 'auth-service'));
    }

    // api-gateway starts failing
    if (Math.random() < 0.6) { // 60% error rate
      logs.push(generateGateway500Error(timestamp));
    } else {
      logs.push(generateHealthyLog(timestamp, 'api-gateway'));
    }

    // Other services still healthy but might show some errors
    for (const service of SERVICES.filter(s => s !== 'auth-service' && s !== 'api-gateway')) {
      if (Math.random() < 0.1) { // 10% error rate
        logs.push({
          ...generateHealthyLog(timestamp, service),
          level: 'WARN',
          message: `Slow response from upstream service`,
          duration_ms: 1500,
        });
      } else {
        logs.push(generateHealthyLog(timestamp, service));
      }
    }
  }

  // Phase 4: Recovery (3 minutes)
  console.log('Phase 4: Recovery phase (3 min)...');
  const recoveryStart = cascadeStart + 3 * 60;
  for (let i = 0; i < 3 * 60; i += 2) {
    const timestamp = new Date(startTime.getTime() + (recoveryStart + i) * 1000);
    const recoveryProgress = i / (3 * 60); // 0 to 1
    const successRate = 0.3 + (recoveryProgress * 0.7); // 30% -> 100%

    for (const _service of SERVICES) {
      logs.push(generateRecoveryLog(timestamp, successRate));
    }
  }

  // Phase 5: Normal State (2 minutes)
  console.log('Phase 5: Back to normal (2 min)...');
  const normalStart = recoveryStart + 3 * 60;
  for (let i = 0; i < 2 * 60; i += 2) {
    const timestamp = new Date(startTime.getTime() + (normalStart + i) * 1000);
    for (const service of SERVICES) {
      logs.push(generateHealthyLog(timestamp, service));
    }
  }

  console.log(`\nGenerated ${logs.length} log entries`);

  // Bulk index to Elasticsearch
  console.log('Indexing logs to Elasticsearch...');
  const bulkBody = logs.flatMap(log => [
    { index: { _index: LOG_INDEX } },
    log,
  ]);

  const bulkResponse = await esClient.bulk({ body: bulkBody, refresh: true });

  if (bulkResponse.errors) {
    console.error('Bulk indexing had errors');
    const erroredDocuments = bulkResponse.items.filter((item: any) => item.index?.error);
    console.error('Errored documents:', JSON.stringify(erroredDocuments, null, 2));
  } else {
    console.log(`Successfully indexed ${logs.length} logs`);
  }

  // Show summary
  const errorLogs = logs.filter(log => log.level === 'ERROR');
  const warnLogs = logs.filter(log => log.level === 'WARN');
  console.log('\nSummary:');
  console.log(`  Total logs: ${logs.length}`);
  console.log(`  ERROR logs: ${errorLogs.length}`);
  console.log(`  WARN logs: ${warnLogs.length}`);
  console.log(`  INFO logs: ${logs.length - errorLogs.length - warnLogs.length}`);

  const dbTimeoutErrors = logs.filter(log => log.error_type === 'DB_TIMEOUT');
  const gatewayErrors = logs.filter(log => log.error_type === 'AUTH_SERVICE_TIMEOUT');
  console.log(`\n  DB_TIMEOUT errors: ${dbTimeoutErrors.length}`);
  console.log(`  Gateway 500 errors: ${gatewayErrors.length}`);

  console.log('\nIncident timeline:');
  console.log(`  ${new Date(startTime).toISOString()} - Normal state begins`);
  console.log(`  ${new Date(startTime.getTime() + triggerStart * 1000).toISOString()} - DB_TIMEOUT errors triggered`);
  console.log(`  ${new Date(startTime.getTime() + cascadeStart * 1000).toISOString()} - Cascade to api-gateway`);
  console.log(`  ${new Date(startTime.getTime() + recoveryStart * 1000).toISOString()} - Recovery begins`);
  console.log(`  ${new Date(startTime.getTime() + normalStart * 1000).toISOString()} - Back to normal`);
}

async function main() {
  try {
    console.log('Starting log generation...\n');
    await generateLogs();
    console.log('\nDone! Logs are ready for analysis.');
  } catch (error) {
    console.error('Error generating logs:', error);
    process.exit(1);
  } finally {
    await esClient.close();
  }
}

main();
