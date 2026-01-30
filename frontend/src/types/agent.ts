/**
 * Frontend types matching backend agent types
 */

export interface ToolCall {
  tool_name: string;
  arguments: Record<string, unknown>;
  timestamp: string;
}

export interface ToolResult {
  tool_name: string;
  result: unknown;
  elasticsearch_query?: unknown;
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

export interface AgentResponse {
  question: string;
  final_answer: string;
  reasoning_steps: ReasoningStep[];
  total_duration_ms: number;
  success: boolean;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agentResponse?: AgentResponse;
  timestamp: string;
}
