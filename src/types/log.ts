import { z } from 'zod';

/**
 * Application log entry schema
 * Designed to capture common log patterns across microservices
 */
export const LogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']),
  service: z.string(),
  message: z.string(),
  trace_id: z.string().optional(),
  user_id: z.string().optional(),
  http_status: z.number().optional(),
  http_method: z.string().optional(),
  endpoint: z.string().optional(),
  duration_ms: z.number().optional(),
  error_type: z.string().optional(),
  error_stack: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

/**
 * Elasticsearch mapping for log index
 * Optimized for time-series queries and aggregations
 */
export const LOG_INDEX_MAPPING = {
  mappings: {
    properties: {
      timestamp: { type: 'date' as const },
      level: { type: 'keyword' as const },
      service: { type: 'keyword' as const },
      message: { type: 'text' as const },
      trace_id: { type: 'keyword' as const },
      user_id: { type: 'keyword' as const },
      http_status: { type: 'integer' as const },
      http_method: { type: 'keyword' as const },
      endpoint: { type: 'keyword' as const },
      duration_ms: { type: 'integer' as const },
      error_type: { type: 'keyword' as const },
      error_stack: { type: 'text' as const },
      metadata: { type: 'object' as const, enabled: true },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0, // Single node setup
    refresh_interval: '1s',
  },
};
