/**
 * Agent Orchestrator - Powered by Elastic Agent Builder
 *
 * Flow:
 * 1. Extract wallet address from question
 * 2. Fetch wallet data from blockchain API & cache to Elasticsearch
 * 3. Elastic Agent Builder queries ES and generates answer
 */

import dotenv from 'dotenv';
dotenv.config();

import { AgentResponse, ReasoningStep } from '../types/agent';
import { executeTool } from './tools';

const ELASTIC_AGENT_ID = process.env.ELASTIC_AGENT_ID || 'elsa-blockchain-agent';
const ELASTIC_URL = process.env.ELASTICSEARCH_URL || '';
const ELASTIC_API_KEY = process.env.ELASTIC_API_KEY || '';

function getKibanaUrl(): string {
    if (process.env.KIBANA_URL) return process.env.KIBANA_URL.replace(/\/$/, '');
    const derived = ELASTIC_URL.replace('.es.', '.kb.').replace(/:\d+$/, '');
    console.log(`[Agent Builder] No KIBANA_URL set, derived from ES URL: ${derived}`);
    return derived;
}

function extractWalletAddress(text: string): string | null {
    const ethMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (ethMatch) return ethMatch[0];
    const btcMatch = text.match(/\b(bc1[a-zA-Z0-9]{39,59}|[13][a-zA-Z0-9]{25,34})\b/);
    if (btcMatch) return btcMatch[0];
    return null;
}

export type StepEvent = {
    type: 'thinking' | 'tool_start' | 'tool_done' | 'done' | 'error';
    step_number: number;
    message: string;
    tool_name?: string;
    execution_time_ms?: number;
};

async function sendToElasticAgent(
    conversationId: string | null,
    message: string,
): Promise<{ answer: string; conversationId: string; steps: any[] }> {
    const kibanaUrl = getKibanaUrl();
    const endpoint = `${kibanaUrl}/api/agent_builder/converse`;

    const body: any = {
        input: message,
        agent_id: ELASTIC_AGENT_ID,
    };

    if (conversationId) {
        body.conversation_id = conversationId;
    }

    if (process.env.ELASTIC_CONNECTOR_ID) {
        body.connector_id = process.env.ELASTIC_CONNECTOR_ID;
    }

    console.log(`[Agent Builder] POST ${endpoint}`);
    console.log(`[Agent Builder] agent_id: ${ELASTIC_AGENT_ID}`);
    console.log(`[Agent Builder] input: ${message.substring(0, 100)}...`);

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${ELASTIC_API_KEY}`,
            'kbn-xsrf': 'true',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Agent Builder] Error ${response.status}: ${errorText}`);
        if (response.status === 401 || response.status === 403) {
            throw new Error(`Elastic Agent Builder auth failed (${response.status}). Check ELASTIC_API_KEY has 'read_agent_builder' privilege.`);
        }
        if (response.status === 404) {
            throw new Error(`Elastic Agent Builder endpoint not found. Check KIBANA_URL (${kibanaUrl}) and that Agent Builder is enabled.`);
        }
        throw new Error(`Elastic Agent API error: ${response.status} - ${errorText}`);
    }

    const text = await response.text();
    console.log(`[Agent Builder] Raw response (first 500 chars): ${text.substring(0, 500)}`);

    let answer = '';
    let newConversationId = conversationId || '';
    const steps: any[] = [];

    try {
        const data = JSON.parse(text);

        if (data.conversation_id) {
            newConversationId = data.conversation_id;
        }

        // Parse steps: 'reasoning' and 'tool_call' types
        if (data.steps && Array.isArray(data.steps)) {
            for (const s of data.steps) {
                if (s.type === 'tool_call') {
                    steps.push({
                        tool: s.tool_id || s.tool || 'unknown',
                        input: s.params || s.input || {},
                        output: s.results || s.output || [],
                        tool_call_id: s.tool_call_id,
                    });
                }
            }
        }

        // Official API response format: { response: { message: "..." } }
        if (data.response && typeof data.response === 'object' && data.response.message) {
            answer = data.response.message;
        } else if (data.response && typeof data.response === 'string') {
            answer = data.response;
        }

        // Fallbacks
        if (!answer) {
            answer = data.output || data.answer || data.message || data.content || '';
        }
        if (!answer && data.steps && Array.isArray(data.steps)) {
            const lastReasoning = [...data.steps].reverse().find((s: any) => s.type === 'reasoning');
            if (lastReasoning) {
                answer = lastReasoning.reasoning || lastReasoning.content || '';
            }
        }

        console.log(`[Agent Builder] Parsed answer (first 200 chars): ${answer.substring(0, 200)}`);
        console.log(`[Agent Builder] Parsed ${steps.length} tool call steps`);

    } catch (e) {
        console.error('[Agent Builder] Failed to parse response:', e);
        throw new Error('Failed to parse response from Elastic Agent Builder');
    }

    return { answer, conversationId: newConversationId, steps };
}

export async function analyzeQuestion(
    question: string,
    onStep?: (event: StepEvent) => void,
): Promise<AgentResponse> {
    const startTime = Date.now();
    const reasoningSteps: ReasoningStep[] = [];
    let stepNumber = 0;

    try {
        onStep?.({ type: 'thinking', step_number: ++stepNumber, message: 'Analyzing request...' });

        // Step 1: Extract wallet address and fetch data to Elasticsearch
        const walletAddress = extractWalletAddress(question);

        if (walletAddress) {
            const fetchStart = Date.now();
            onStep?.({
                type: 'tool_start',
                step_number: ++stepNumber,
                message: 'Fetching wallet data from blockchain...',
                tool_name: 'fetch_wallet_data',
            });

            try {
                const fetchResult = await executeTool('fetch_wallet_data', { address: walletAddress });
                const fetchTime = Date.now() - fetchStart;

                reasoningSteps.push({
                    step_number: stepNumber,
                    thought: `Fetched and cached wallet data for ${walletAddress}`,
                    tool_call: {
                        tool_name: 'fetch_wallet_data',
                        arguments: { address: walletAddress },
                        timestamp: new Date().toISOString(),
                    },
                    tool_result: {
                        tool_name: 'fetch_wallet_data',
                        result: fetchResult,
                        execution_time_ms: fetchTime,
                        timestamp: new Date().toISOString(),
                    },
                    timestamp: new Date().toISOString(),
                });

                onStep?.({
                    type: 'tool_done',
                    step_number: stepNumber,
                    message: 'Wallet data cached in Elasticsearch',
                    tool_name: 'fetch_wallet_data',
                    execution_time_ms: fetchTime,
                });
            } catch (fetchError) {
                console.error('Failed to fetch wallet data:', fetchError);
                onStep?.({
                    type: 'tool_done',
                    step_number: stepNumber,
                    message: 'Using cached wallet data',
                    tool_name: 'fetch_wallet_data',
                });
            }
        }

        // Step 2: Send to Elastic Agent Builder for analysis
        onStep?.({ type: 'thinking', step_number: ++stepNumber, message: 'Elastic Agent analyzing data...' });

        const { answer, steps } = await sendToElasticAgent(null, question);

        // Step 3: Process tool steps from Elastic Agent for Glass Box
        const toolLabel: Record<string, string> = {
            'platform.core.search': 'Searching transactions in Elasticsearch',
            'platform.core.get_document_by_id': 'Retrieving wallet summary',
            'platform.core.execute_esql': 'Running ES|QL analytics query',
            'platform.core.generate_esql': 'Generating analytics query',
            'platform.core.get_index_mapping': 'Getting index structure',
            'platform.core.list_indices': 'Listing available indices',
        };

        for (const step of steps) {
            stepNumber++;

            onStep?.({
                type: 'tool_start',
                step_number: stepNumber,
                message: toolLabel[step.tool] || `Running ${step.tool}`,
                tool_name: step.tool,
            });

            reasoningSteps.push({
                step_number: stepNumber,
                thought: toolLabel[step.tool] || `Using ${step.tool}`,
                tool_call: {
                    tool_name: step.tool,
                    arguments: step.input,
                    timestamp: new Date().toISOString(),
                },
                tool_result: {
                    tool_name: step.tool,
                    result: step.output,
                    timestamp: new Date().toISOString(),
                },
                timestamp: new Date().toISOString(),
            });

            onStep?.({
                type: 'tool_done',
                step_number: stepNumber,
                message: `${toolLabel[step.tool] || step.tool} complete`,
                tool_name: step.tool,
                execution_time_ms: 0,
            });
        }

        stepNumber++;
        reasoningSteps.push({
            step_number: stepNumber,
            thought: 'Formulating final answer based on Elasticsearch data',
            timestamp: new Date().toISOString(),
        });

        onStep?.({ type: 'done', step_number: stepNumber, message: 'Analysis complete' });

        const totalDuration = Date.now() - startTime;

        return {
            question,
            final_answer: answer || 'No answer provided by Elastic Agent',
            reasoning_steps: reasoningSteps,
            total_duration_ms: totalDuration,
            success: true,
        };
    } catch (error) {
        const totalDuration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        console.error('Error in Elastic Agent orchestrator:', errorMessage);
        onStep?.({ type: 'error', step_number: stepNumber, message: errorMessage });

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