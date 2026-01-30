/**
 * Agent types for Glass Box transparency
 * These types track the agent's internal reasoning process
 */

export interface ToolCall {
  tool_name: string;
  arguments: Record<string, unknown>;
  timestamp: string;
}

export interface ToolResult {
  tool_name: string;
  result: unknown;
  elasticsearch_query?: unknown; // The actual ES query for transparency
  execution_time_ms?: number;
  timestamp: string;
}

export interface ReasoningStep {
  step_number: number;
  thought: string;
  tool_call?: ToolCall;
  tool_result?: ToolResult;
  timestamp: string;
}

/**
 * The complete "Glass Box" response
 * Shows both the final answer and all intermediate steps
 */
export interface AgentResponse {
  question: string;
  final_answer: string;
  reasoning_steps: ReasoningStep[];
  total_duration_ms: number;
  success: boolean;
  error?: string;
}

/**
 * Time range for log queries
 */
export interface TimeRange {
  from: string; // ISO 8601 datetime
  to: string; // ISO 8601 datetime
}
