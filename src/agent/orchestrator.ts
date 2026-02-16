/**
 * Agent Orchestrator - The brain of the crypto wallet analysis agent
 *
 * Implements a "Glass Box" agent that:
 * 1. Takes a user question about a Bitcoin or Ethereum wallet
 * 2. Calls LLM with available tools (fetch, search, summarize, detect anomalies)
 * 3. Executes tool calls against blockchain.info / Etherscan API + Elasticsearch
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

  return `You are an expert blockchain analyst supporting both Bitcoin and Ethereum. Your job is to help users investigate wallet addresses — fetching transaction history, identifying patterns, and detecting suspicious or anomalous activity.

Current time: ${now.toISOString()}

SUPPORTED CHAINS:
- Bitcoin: addresses start with 1, 3, or bc1 (e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa)
- Ethereum: addresses start with 0x and are 42 characters (e.g., 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)

The chain is auto-detected from the address format. You do not need to specify it.

WORKFLOW — Follow this order for wallet analysis:
1. Use fetch_wallet_data to pull transactions and cache them in Elasticsearch.
2. Use get_wallet_summary to retrieve the cached overview (balance, totals, tx count).
3. Use search_transactions to drill into specific transactions (filter by direction, value range, time range).
4. Use detect_anomalies to run algorithmic checks for suspicious patterns.

ANALYSIS GUIDELINES:
- Bitcoin: values in satoshis (1 BTC = 100,000,000 satoshis). Report as BTC.
- Ethereum: values in wei (1 ETH = 10^18 wei). Report as ETH. Gas prices in Gwei.
- Cite specific transaction hashes (tx_hash) when discussing individual transactions.
- Explain anomaly types clearly: what the pattern means and why it could be suspicious.
- If the wallet has many transactions, fetch in batches and summarize trends.

TOKEN ANALYSIS (Ethereum):
- The wallet summary includes a token_summary array listing each ERC-20 token the wallet has traded.
- For each token, you get: symbol, name, contract address, total_in, total_out, and tx_count.
- ALWAYS include a "Token Activity" section in your analysis that lists:
  - Each token traded (symbol and name)
  - Volume in/out for each token
  - Number of transactions per token
  - Any notable patterns (heavy trading in one token, one-sided flows, etc.)
- If no tokens were traded, mention that the wallet only transacted in native ETH.

ANOMALY TYPES TO WATCH FOR:
- Large transactions: statistically unusual amounts (above mean + 2× std deviation)
- Rapid sequences / mixing: many transactions in short bursts (potential tumbler/bot usage)
- Round-number transactions: suspiciously exact amounts (1.0, 0.5, 0.1 BTC/ETH)
- Dormant wallet reactivation: long inactivity followed by sudden activity
- Fan-out (Bitcoin): single input going to many outputs (distribution pattern)
- Fan-in (Bitcoin): many inputs consolidating into few outputs (aggregation pattern)
- Failed transactions (Ethereum): reverted or errored transactions
- High gas prices (Ethereum): unusually high gas indicating urgency or MEV

Always provide a clear summary with: chain, total balance, transaction count, date range of activity, token activity breakdown (for Ethereum), and any anomalies found.`;
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

