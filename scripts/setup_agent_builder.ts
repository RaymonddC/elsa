/**
 * Setup Script: Register Custom Agent & Tools in Elastic Agent Builder
 *
 * This script creates:
 * 1. Custom tools (index search tools scoped to wallet-transactions and wallet-summaries)
 * 2. Custom agent (elsa-blockchain-agent) with instructions and tools
 *
 * Run this ONCE before using the app:
 *   npx tsx scripts/setup_agent_builder.ts
 */

import dotenv from 'dotenv';
dotenv.config();

const KIBANA_URL = (process.env.KIBANA_URL || '').replace(/\/$/, '');
const API_KEY = process.env.ELASTIC_API_KEY || '';
const AGENT_ID = process.env.ELASTIC_AGENT_ID || 'elsa-blockchain-agent';

if (!KIBANA_URL || !API_KEY) {
    console.error('ERROR: KIBANA_URL and ELASTIC_API_KEY must be set in .env');
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    Authorization: `ApiKey ${API_KEY}`,
    'kbn-xsrf': 'true',
};

async function apiCall(method: string, path: string, body?: any) {
    const url = `${KIBANA_URL}${path}`;
    console.log(`${method} ${url}`);

    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
        console.error(`  ERROR ${res.status}: ${text.substring(0, 500)}`);
        return null;
    }

    try {
        const data = JSON.parse(text);
        console.log(`  OK`);
        return data;
    } catch {
        console.log(`  OK (non-JSON response)`);
        return text;
    }
}

async function listExistingTools(): Promise<any[]> {
    const data = await apiCall('GET', '/api/agent_builder/tools');
    return Array.isArray(data) ? data : (data?.tools || []);
}

async function listExistingAgents(): Promise<any[]> {
    const data = await apiCall('GET', '/api/agent_builder/agents');
    return Array.isArray(data) ? data : (data?.agents || []);
}

async function createOrUpdateTool(tool: any) {
    // Try to update first, then create
    const existing = await apiCall('GET', `/api/agent_builder/tools/${tool.id}`);
    if (existing && !existing.error) {
        console.log(`  Tool '${tool.id}' exists, updating...`);
        return await apiCall('PUT', `/api/agent_builder/tools/${tool.id}`, tool);
    }
    console.log(`  Creating tool '${tool.id}'...`);
    return await apiCall('POST', '/api/agent_builder/tools', tool);
}

async function createOrUpdateAgent(agent: any) {
    const existing = await apiCall('GET', `/api/agent_builder/agents/${agent.id}`);
    if (existing && !existing.error) {
        console.log(`  Agent '${agent.id}' exists, updating...`);
        return await apiCall('PUT', `/api/agent_builder/agents/${agent.id}`, agent);
    }
    console.log(`  Creating agent '${agent.id}'...`);
    return await apiCall('POST', '/api/agent_builder/agents', agent);
}

async function main() {
    console.log('='.repeat(60));
    console.log('ELSA - Elastic Agent Builder Setup');
    console.log('='.repeat(60));
    console.log(`Kibana URL: ${KIBANA_URL}`);
    console.log(`Agent ID:   ${AGENT_ID}`);
    console.log();

    // Step 1: List existing tools and agents
    console.log('--- Checking existing tools ---');
    const existingTools = await listExistingTools();
    console.log(`  Found ${existingTools.length} existing tools`);

    console.log('--- Checking existing agents ---');
    const existingAgents = await listExistingAgents();
    console.log(`  Found ${existingAgents.length} existing agents`);
    console.log();

    // Step 2: Create custom tools
    console.log('--- Creating/Updating Custom Tools ---');

    // Tool 1: Search wallet transactions index
    await createOrUpdateTool({
        id: 'elsa-search-wallet-transactions',
        type: 'index',
        description: 'Search blockchain wallet transactions stored in Elasticsearch. This index contains Bitcoin and Ethereum transaction data including: tx_hash, address, chain (bitcoin/ethereum), time, time_iso, direction (incoming/outgoing), value_btc, value_eth, fee_btc, fee_eth, from_address, to_address, is_token_transfer, token_symbol, token_name, token_value, gas_price_gwei, is_error, block_height. Use this to find transactions by wallet address, filter by direction, time range, value, or token. Sort by time or value.',
        configuration: {
            index: 'wallet-transactions',
        },
    });

    // Tool 2: Search wallet summaries index
    await createOrUpdateTool({
        id: 'elsa-search-wallet-summaries',
        type: 'index',
        description: 'Search blockchain wallet summary data. This index contains one document per wallet address with fields: address, chain (bitcoin/ethereum), n_tx (total transaction count), total_received_btc/eth, total_sent_btc/eth, final_balance_btc/eth, final_balance_wei, eth_price_usd, total_received_usd, total_sent_usd, balance_usd, token_summary (array of token breakdown with symbol, name, total_in, total_out, tx_count, price_usd), first_seen, last_seen, fetched_at. Use this to get wallet overview, balance, and token holdings.',
        configuration: {
            index: 'wallet-summaries',
        },
    });

    // Tool 3: ES|QL tool for analytics
    await createOrUpdateTool({
        id: 'elsa-wallet-analytics',
        type: 'esql',
        description: 'Run ES|QL analytics queries on wallet transaction data. Use this for aggregations like: counting transactions by direction, finding top counterparties, calculating total value transferred in time ranges, detecting patterns. The main index is "wallet-transactions" with fields: address, chain, direction, value_btc, value_eth, time, time_iso, tx_hash, from_address, to_address, is_token_transfer, token_symbol, token_value, gas_price_gwei, fee_eth, fee_btc, is_error.',
        configuration: {
            query: 'FROM wallet-transactions | STATS count = COUNT(*) BY direction | SORT count DESC',
        },
        params: {
            wallet_address: {
                type: 'keyword',
                description: 'The wallet address to analyze',
            },
        },
    });

    console.log();

    // Step 3: Create the custom agent
    console.log('--- Creating/Updating Custom Agent ---');

    const agentInstructions = `You are ELSA (ELasticsearch Agent), a blockchain wallet analysis assistant. You help users analyze Bitcoin and Ethereum wallet activity using data stored in Elasticsearch.

## Your Capabilities
- Search wallet transactions (incoming/outgoing, by value, time range, token)
- Get wallet summaries (balance, total received/sent, token holdings)
- Run analytics queries on transaction data using ES|QL
- Detect anomalies and patterns in wallet activity
- Provide insights on wallet behavior and risk

## Data Available
1. **wallet-transactions** index: Contains individual transaction records with fields like tx_hash, address, chain, direction, value_btc/value_eth, time_iso, from_address, to_address, is_token_transfer, token_symbol, token_value, gas_price_gwei, fee_eth, is_error
2. **wallet-summaries** index: Contains per-wallet summaries with balance, totals, token breakdown, USD values

## How to Respond
1. When asked about a wallet, FIRST search the wallet-summaries index to get an overview
2. Then search wallet-transactions for specific details
3. Use ES|QL for complex analytics (aggregations, top-N, time-series)
4. Always mention the chain (Bitcoin or Ethereum) in your response
5. Format currency values clearly (BTC, ETH, USD)
6. If data is not found, suggest the user fetch wallet data first

## Important Notes
- Ethereum addresses start with 0x and are 42 characters
- Bitcoin addresses start with 1, 3, or bc1
- Token transfers have is_token_transfer=true and token_symbol/token_value fields
- Direction is either "incoming" or "outgoing" relative to the wallet address
- Always provide transaction hashes when referencing specific transactions`;

    await createOrUpdateAgent({
        id: AGENT_ID,
        name: 'ELSA Blockchain Agent',
        description: 'AI-powered blockchain wallet analyzer that queries Elasticsearch for Bitcoin and Ethereum transaction data.',
        instructions: agentInstructions,
        tools: [
            'elsa-search-wallet-transactions',
            'elsa-search-wallet-summaries',
            'elsa-wallet-analytics',
            // Also include built-in tools
            'platform.core.search',
            'platform.core.list_indices',
            'platform.core.get_index_mapping',
            'platform.core.get_document_by_id',
        ],
    });

    console.log();
    console.log('='.repeat(60));
    console.log('Setup complete!');
    console.log();
    console.log('Next steps:');
    console.log('1. Verify in Kibana > Agents that the agent appears');
    console.log('2. Test by chatting in Kibana: "Show me the indices"');
    console.log('3. Fetch wallet data via the app, then ask the agent about it');
    console.log('='.repeat(60));
}

main().catch(err => {
    console.error('Setup failed:', err);
    process.exit(1);
});
