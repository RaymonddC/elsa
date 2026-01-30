/**
 * Agent Orchestrator - The brain of the log analysis agent
 *
 * Implements a "Glass Box" agent that:
 * 1. Takes a user question
 * 2. Calls LLM with available tools
 * 3. Executes tool calls against Elasticsearch
 * 4. Logs EVERY step for transparency
 * 5. Returns final answer with complete reasoning trace
 */

import OpenAI from 'openai';
import { TOOL_DEFINITIONS, executeTool } from './tools';
import { AgentResponse, ReasoningStep, ToolCall, ToolResult } from '../types/agent';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Dynamic system prompt with current time
function getSystemPrompt(): string {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  return `You are an expert log analysis agent. Your job is to help users understand application logs, detect anomalies, and diagnose issues.

IMPORTANT - Current Time Context:
- Current time (NOW): ${now.toISOString()}
- 15 minutes ago: ${fifteenMinutesAgo.toISOString()}
- 1 hour ago: ${oneHourAgo.toISOString()}

When users ask about "last 15 minutes" or "last hour", use these exact timestamps for your time_range queries.

You have access to tools to search and aggregate logs from an Elasticsearch index. Use these tools to answer user questions accurately.

Guidelines:
- ALWAYS use the current timestamps provided above for time ranges
- When you detect patterns or anomalies, explain the root cause
- If you see cascading errors, trace them back to the origin
- Be specific: mention service names, error types, timestamps
- If you need more information, make additional tool calls

Available services: api-gateway, auth-service, user-service, payment-service, notification-service

Common error types: DB_TIMEOUT, AUTH_SERVICE_TIMEOUT, NETWORK_ERROR, VALIDATION_ERROR`;
}

const MAX_ITERATIONS = 10; // Prevent infinite loops

/**
 * Main agent loop with Glass Box transparency
 */
export async function analyzeQuestion(question: string): Promise<AgentResponse> {
  const startTime = Date.now();
  const reasoningSteps: ReasoningStep[] = [];
  let stepNumber = 0;

  try {
    // Initialize conversation with system prompt and user question
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: getSystemPrompt() },
      { role: 'user', content: question },
    ];

    let iteration = 0;
    let finalAnswer: string | null = null;

    // Agent loop: LLM -> Tool Call -> Execute -> LLM -> ...
    while (iteration < MAX_ITERATIONS && !finalAnswer) {
      iteration++;

      console.log(`\n=== Iteration ${iteration} ===`);

      // Call LLM
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
      });

      const assistantMessage = response.choices[0].message;
      console.log('LLM Response:', assistantMessage.content || '[Tool calls]');

      // Add assistant message to conversation
      messages.push(assistantMessage);

      // Check if LLM wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Process each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          stepNumber++;
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          console.log(`\nTool Call: ${toolName}`);
          console.log('Arguments:', JSON.stringify(toolArgs, null, 2));

          // Log tool call in reasoning steps
          const toolCallLog: ToolCall = {
            tool_name: toolName,
            arguments: toolArgs,
            timestamp: new Date().toISOString(),
          };

          // Execute tool
          const toolResult = await executeTool(toolName, toolArgs);

          console.log(`Tool Result: ${JSON.stringify(toolResult).substring(0, 200)}...`);

          // Log tool result in reasoning steps
          const toolResultLog: ToolResult = {
            tool_name: toolName,
            result: toolResult,
            elasticsearch_query: toolResult.elasticsearch_query,
            execution_time_ms: toolResult.execution_time_ms,
            timestamp: new Date().toISOString(),
          };

          // Add reasoning step
          reasoningSteps.push({
            step_number: stepNumber,
            thought: assistantMessage.content || `Calling ${toolName} to gather information`,
            tool_call: toolCallLog,
            tool_result: toolResultLog,
            timestamp: new Date().toISOString(),
          });

          // Send tool result back to LLM
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
      } else {
        // No more tool calls - LLM has final answer
        finalAnswer = assistantMessage.content || 'No answer provided';

        // Add final reasoning step
        stepNumber++;
        reasoningSteps.push({
          step_number: stepNumber,
          thought: 'Formulating final answer based on gathered data',
          timestamp: new Date().toISOString(),
        });

        console.log('\nFinal Answer:', finalAnswer);
      }
    }

    if (!finalAnswer) {
      throw new Error('Max iterations reached without final answer');
    }

    const totalDuration = Date.now() - startTime;

    return {
      question,
      final_answer: finalAnswer,
      reasoning_steps: reasoningSteps,
      total_duration_ms: totalDuration,
      success: true,
    };
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Error in agent orchestrator:', errorMessage);

    return {
      question,
      final_answer: '',
      reasoning_steps: reasoningSteps,
      total_duration_ms: totalDuration,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Helper to get a default time range (last N minutes)
 */
export function getDefaultTimeRange(minutesAgo: number = 60): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - minutesAgo * 60 * 1000);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
