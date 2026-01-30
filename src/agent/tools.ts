/**
 * Agent tools - Functions the LLM can call to interact with Elasticsearch
 * Uses OpenAI function calling format
 */

import { esClient, LOG_INDEX } from '../config/elasticsearch';
import { z } from 'zod';

// Tool parameter schemas for validation
export const SearchLogsParamsSchema = z.object({
  query: z.string().optional().default('*').describe('Search query for log messages (default: * for all)'),
  time_range: z.object({
    from: z.string().describe('Start time (ISO 8601)'),
    to: z.string().describe('End time (ISO 8601)'),
  }).optional(),
  service: z.string().optional().describe('Filter by service name'),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']).optional().describe('Filter by log level'),
  limit: z.number().default(100).describe('Max number of results'),
});

export const AggregateErrorsParamsSchema = z.object({
  field: z.enum(['error_type', 'service', 'http_status']).describe('Field to aggregate by'),
  time_range: z.object({
    from: z.string().describe('Start time (ISO 8601)'),
    to: z.string().describe('End time (ISO 8601)'),
  }).optional(),
  top_n: z.number().default(10).describe('Number of top results'),
});

export type SearchLogsParams = z.infer<typeof SearchLogsParamsSchema>;
export type AggregateErrorsParams = z.infer<typeof AggregateErrorsParamsSchema>;

/**
 * OpenAI function definitions
 * These tell the LLM what tools are available
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_logs',
      description: 'Search application logs with filters. Use this to find specific log entries, errors, or patterns.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for log messages (supports wildcards). Use "*" for all logs.',
          },
          time_range: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Start time in ISO 8601 format' },
              to: { type: 'string', description: 'End time in ISO 8601 format' },
            },
          },
          service: {
            type: 'string',
            description: 'Filter by specific service name (e.g., "auth-service", "api-gateway")',
          },
          level: {
            type: 'string',
            enum: ['INFO', 'WARN', 'ERROR', 'DEBUG'],
            description: 'Filter by log level',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default: 100)',
            default: 100,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'aggregate_errors',
      description: 'Aggregate and count errors by a specific field. Use this to identify patterns, top errors, or affected services.',
      parameters: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            enum: ['error_type', 'service', 'http_status'],
            description: 'Field to group by',
          },
          time_range: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Start time in ISO 8601 format' },
              to: { type: 'string', description: 'End time in ISO 8601 format' },
            },
          },
          top_n: {
            type: 'number',
            description: 'Number of top results to return (default: 10)',
            default: 10,
          },
        },
        required: ['field'],
      },
    },
  },
];

/**
 * Execute search_logs tool
 * Returns both the results and the ES query for Glass Box transparency
 */
export async function executeSearchLogs(params: SearchLogsParams) {
  const startTime = Date.now();

  // Build Elasticsearch query
  const mustClauses: any[] = [
    {
      query_string: {
        query: params.query,
        fields: ['message', 'error_type', 'error_stack'],
        default_operator: 'AND',
      },
    },
  ];

  if (params.service) {
    mustClauses.push({ term: { service: params.service } });
  }

  if (params.level) {
    mustClauses.push({ term: { level: params.level } });
  }

  if (params.time_range) {
    mustClauses.push({
      range: {
        timestamp: {
          gte: params.time_range.from,
          lte: params.time_range.to,
        },
      },
    });
  }

  const esQuery = {
    index: LOG_INDEX,
    body: {
      query: {
        bool: {
          must: mustClauses,
        },
      },
      sort: [{ timestamp: 'desc' }],
      size: params.limit,
    },
  };

  // Execute query
  const response = await esClient.search(esQuery);

  const executionTime = Date.now() - startTime;

  return {
    results: response.hits.hits.map((hit: any) => hit._source),
    total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
    elasticsearch_query: esQuery.body, // For Glass Box
    execution_time_ms: executionTime,
  };
}

/**
 * Execute aggregate_errors tool
 * Returns both the results and the ES query for Glass Box transparency
 */
export async function executeAggregateErrors(params: AggregateErrorsParams) {
  const startTime = Date.now();

  // Build Elasticsearch aggregation query
  const mustClauses: any[] = [
    { term: { level: 'ERROR' } }, // Only aggregate errors
  ];

  if (params.time_range) {
    mustClauses.push({
      range: {
        timestamp: {
          gte: params.time_range.from,
          lte: params.time_range.to,
        },
      },
    });
  }

  const esQuery = {
    index: LOG_INDEX,
    body: {
      query: {
        bool: {
          must: mustClauses,
        },
      },
      size: 0, // We only want aggregations
      aggs: {
        grouped: {
          terms: {
            field: params.field,
            size: params.top_n,
            order: { _count: 'desc' },
          },
        },
      },
    },
  };

  // Execute query
  const response = await esClient.search(esQuery);

  const executionTime = Date.now() - startTime;

  const buckets = (response.aggregations?.grouped as any)?.buckets || [];

  return {
    aggregations: buckets.map((bucket: any) => ({
      key: bucket.key,
      count: bucket.doc_count,
    })),
    total_errors: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
    elasticsearch_query: esQuery.body, // For Glass Box
    execution_time_ms: executionTime,
  };
}

/**
 * Tool executor - Routes tool calls to the appropriate function
 */
export async function executeTool(toolName: string, args: any) {
  switch (toolName) {
    case 'search_logs': {
      const params = SearchLogsParamsSchema.parse(args);
      return await executeSearchLogs(params);
    }
    case 'aggregate_errors': {
      const params = AggregateErrorsParamsSchema.parse(args);
      return await executeAggregateErrors(params);
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
