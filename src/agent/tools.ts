/**
 * Agent tools - Functions the LLM can call to analyze Bitcoin and Ethereum wallets
 * Uses OpenAI function calling format
 */

import { esClient, WALLET_TX_INDEX, WALLET_SUMMARY_INDEX } from '../config/elasticsearch';
import { fetchWalletFromBlockchain, satoshiToBTC, detectChain } from '../services/blockchain';
import { fetchEthBalance, fetchEthTransactions, fetchEthTokenTransactions, weiToETH, tokenToDecimal } from '../services/etherscan';
import type { WalletTransaction, WalletSummary } from '../types/wallet';
import { z } from 'zod';

// Tool parameter schemas
const FetchWalletParamsSchema = z.object({
  address: z.string(),
  limit: z.number().default(50).optional(),
  chain: z.enum(['bitcoin', 'ethereum']).optional(),
});

const SearchTransactionsParamsSchema = z.object({
  address: z.string(),
  direction: z.enum(['incoming', 'outgoing']).optional(),
  min_value_btc: z.number().optional(),
  max_value_btc: z.number().optional(),
  min_value_eth: z.number().optional(),
  max_value_eth: z.number().optional(),
  time_range: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
  limit: z.number().default(50).optional(),
  sort_by: z.enum(['time', 'value']).default('time').optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc').optional(),
});

const GetWalletSummaryParamsSchema = z.object({
  address: z.string(),
});

const DetectAnomaliesParamsSchema = z.object({
  address: z.string(),
  sensitivity: z.enum(['low', 'medium', 'high']).default('medium').optional(),
});

/**
 * OpenAI function definitions for the LLM
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'fetch_wallet_data',
      description: 'Fetch wallet data from blockchain API and cache it in Elasticsearch. Supports both Bitcoin and Ethereum. Auto-detects chain from address format. Use this FIRST when analyzing a new wallet address. For Ethereum wallets, also fetches ERC-20 token transfers and returns a token_summary with per-token breakdown (symbol, name, total_in, total_out, tx_count).',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Wallet address. Bitcoin: starts with 1, 3, or bc1 (e.g., "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"). Ethereum: starts with 0x, 42 chars (e.g., "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")',
          },
          limit: {
            type: 'number',
            description: 'Number of transactions to fetch (default: 50, max: 100)',
            default: 50,
          },
          chain: {
            type: 'string',
            enum: ['bitcoin', 'ethereum'],
            description: 'Blockchain to query. Auto-detected from address format if not specified.',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_transactions',
      description: 'Search cached wallet transactions with filters. Use after fetch_wallet_data. Supports both Bitcoin and Ethereum wallets.',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Wallet address to search transactions for',
          },
          direction: {
            type: 'string',
            enum: ['incoming', 'outgoing'],
            description: 'Filter by transaction direction',
          },
          min_value_btc: {
            type: 'number',
            description: 'Minimum transaction value in BTC (Bitcoin only)',
          },
          max_value_btc: {
            type: 'number',
            description: 'Maximum transaction value in BTC (Bitcoin only)',
          },
          min_value_eth: {
            type: 'number',
            description: 'Minimum transaction value in ETH (Ethereum only)',
          },
          max_value_eth: {
            type: 'number',
            description: 'Maximum transaction value in ETH (Ethereum only)',
          },
          time_range: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Start time (ISO 8601)' },
              to: { type: 'string', description: 'End time (ISO 8601)' },
            },
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default: 50)',
            default: 50,
          },
          sort_by: {
            type: 'string',
            enum: ['time', 'value'],
            description: 'Sort by time or value (default: time)',
          },
          sort_order: {
            type: 'string',
            enum: ['asc', 'desc'],
            description: 'Sort order (default: desc)',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_wallet_summary',
      description: 'Get cached summary for a wallet address including balance, totals, transaction count, and token_summary (per-token breakdown for Ethereum). Works for both Bitcoin and Ethereum.',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Wallet address (Bitcoin or Ethereum)',
          },
        },
        required: ['address'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'detect_anomalies',
      description: 'Analyze cached transactions for anomalous patterns: unusually large transactions, rapid sequences (mixing), round-number transactions, dormant wallet reactivation, fan-out/fan-in patterns. Works for both Bitcoin and Ethereum. Use after fetch_wallet_data.',
      parameters: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'Wallet address to analyze (Bitcoin or Ethereum)',
          },
          sensitivity: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Anomaly detection sensitivity (default: medium)',
          },
        },
        required: ['address'],
      },
    },
  },
];

/**
 * Execute fetch_wallet_data: Fetch from blockchain API, cache in ES
 */
async function executeFetchWalletData(params: z.infer<typeof FetchWalletParamsSchema>) {
  const startTime = Date.now();
  const chain = params.chain || detectChain(params.address);
  const limit = Math.min(params.limit || 50, 100);
  const now = new Date().toISOString();

  if (chain === 'bitcoin') {
    return await fetchBitcoinWallet(params.address, limit, now, startTime);
  } else {
    return await fetchEthereumWallet(params.address, limit, now, startTime);
  }
}

async function fetchBitcoinWallet(address: string, limit: number, now: string, startTime: number) {
  const apiData = await fetchWalletFromBlockchain(address, limit);

  const transactions: WalletTransaction[] = apiData.txs.map(tx => {
    const inputAddrs = tx.inputs
      .map(i => i.prev_out?.addr)
      .filter((a): a is string => !!a);
    const outputAddrs = tx.out
      .map(o => o.addr)
      .filter((a): a is string => !!a);
    const isIncoming = tx.result > 0;
    const valueAbs = Math.abs(tx.result);

    return {
      tx_hash: tx.hash,
      address,
      chain: 'bitcoin' as const,
      time: tx.time,
      time_iso: new Date(tx.time * 1000).toISOString(),
      fee_satoshis: tx.fee,
      fee_btc: satoshiToBTC(tx.fee),
      result_satoshis: tx.result,
      result_btc: satoshiToBTC(tx.result),
      direction: isIncoming ? 'incoming' as const : 'outgoing' as const,
      value_satoshis: valueAbs,
      value_btc: satoshiToBTC(valueAbs),
      input_addresses: inputAddrs,
      output_addresses: outputAddrs,
      input_count: tx.inputs.length,
      output_count: tx.out.length,
      block_height: tx.block_height,
      fetched_at: now,
    };
  });

  const firstTx = transactions.length > 0
    ? transactions.reduce((a, b) => a.time < b.time ? a : b)
    : null;
  const lastTx = transactions.length > 0
    ? transactions.reduce((a, b) => a.time > b.time ? a : b)
    : null;

  const summary: WalletSummary = {
    address: apiData.address,
    chain: 'bitcoin',
    n_tx: apiData.n_tx,
    total_received_satoshis: apiData.total_received,
    total_received_btc: satoshiToBTC(apiData.total_received),
    total_sent_satoshis: apiData.total_sent,
    total_sent_btc: satoshiToBTC(apiData.total_sent),
    final_balance_satoshis: apiData.final_balance,
    final_balance_btc: satoshiToBTC(apiData.final_balance),
    first_seen: firstTx ? firstTx.time_iso : undefined,
    last_seen: lastTx ? lastTx.time_iso : undefined,
    fetched_at: now,
  };

  await indexTransactionsAndSummary(address, transactions, summary);

  return {
    chain: 'bitcoin',
    summary,
    transactions_fetched: transactions.length,
    total_transactions: apiData.n_tx,
    sample_transactions: transactions.slice(0, 10).map(tx => ({
      tx_hash: tx.tx_hash,
      direction: tx.direction,
      value_btc: tx.value_btc,
      fee_btc: tx.fee_btc,
      time: tx.time_iso,
      input_count: tx.input_count,
      output_count: tx.output_count,
    })),
    execution_time_ms: Date.now() - startTime,
  };
}

async function fetchEthereumWallet(address: string, limit: number, now: string, startTime: number) {
  const tokenLimit = Math.min(limit * 3, 300); // fetch more token txs to ensure overlap with normal txs
  const [balanceWei, ethTxs, tokenTxs] = await Promise.all([
    fetchEthBalance(address),
    fetchEthTransactions(address, 1, limit, 'desc'),
    fetchEthTokenTransactions(address, 1, tokenLimit, 'desc'),
  ]);

  const addressLower = address.toLowerCase();

  // Normal ETH transactions
  const normalTransactions: WalletTransaction[] = ethTxs.map(tx => {
    const isIncoming = tx.to.toLowerCase() === addressLower;
    const valueEth = weiToETH(tx.value);
    const gasUsed = parseInt(tx.gasUsed, 10);
    const gasPrice = parseInt(tx.gasPrice, 10);
    const feeWei = gasUsed * gasPrice;
    const feeEth = weiToETH(feeWei.toString());
    const timestamp = parseInt(tx.timeStamp, 10);

    return {
      tx_hash: tx.hash,
      address,
      chain: 'ethereum' as const,
      time: timestamp,
      time_iso: new Date(timestamp * 1000).toISOString(),
      direction: isIncoming ? 'incoming' as const : 'outgoing' as const,
      value_wei: tx.value,
      value_eth: valueEth,
      gas_used: gasUsed,
      gas_price_gwei: gasPrice / 1e9,
      fee_eth: feeEth,
      from_address: tx.from,
      to_address: tx.to,
      is_error: tx.isError === '1',
      is_token_transfer: false,
      block_height: parseInt(tx.blockNumber, 10),
      fetched_at: now,
    };
  });

  // ERC-20 token transactions (only those not already in normal txs)
  const normalTxHashes = new Set(normalTransactions.map(tx => tx.tx_hash));
  const tokenTransactions: WalletTransaction[] = tokenTxs
    .filter(tx => !normalTxHashes.has(tx.hash)) // avoid duplicates
    .map(tx => {
      const isIncoming = tx.to.toLowerCase() === addressLower;
      const tokenVal = tokenToDecimal(tx.value, tx.tokenDecimal);
      const timestamp = parseInt(tx.timeStamp, 10);

      return {
        tx_hash: tx.hash,
        address,
        chain: 'ethereum' as const,
        time: timestamp,
        time_iso: new Date(timestamp * 1000).toISOString(),
        direction: isIncoming ? 'incoming' as const : 'outgoing' as const,
        value_eth: 0, // no native ETH transferred
        from_address: tx.from,
        to_address: tx.to,
        is_token_transfer: true,
        token_name: tx.tokenName,
        token_symbol: tx.tokenSymbol,
        token_decimals: parseInt(tx.tokenDecimal, 10),
        token_contract: tx.contractAddress,
        token_value: tokenVal,
        token_value_raw: tx.value,
        block_height: parseInt(tx.blockNumber, 10),
        fetched_at: now,
      };
    });

  // Also update normal txs that had 0 ETH but have a matching token transfer
  const tokenByHash = new Map(tokenTxs.map(tx => [tx.hash, tx]));
  for (const tx of normalTransactions) {
    const tokenTx = tokenByHash.get(tx.tx_hash);
    if (tokenTx && (tx.value_eth === 0 || tx.value_eth === undefined)) {
      tx.is_token_transfer = true;
      tx.token_name = tokenTx.tokenName;
      tx.token_symbol = tokenTx.tokenSymbol;
      tx.token_decimals = parseInt(tokenTx.tokenDecimal, 10);
      tx.token_contract = tokenTx.contractAddress;
      tx.token_value = tokenToDecimal(tokenTx.value, tokenTx.tokenDecimal);
      tx.token_value_raw = tokenTx.value;
    }
  }

  const transactions = [...normalTransactions, ...tokenTransactions];

  const incoming = transactions.filter(tx => tx.direction === 'incoming');
  const outgoing = transactions.filter(tx => tx.direction === 'outgoing');
  const totalReceivedEth = incoming.reduce((sum, tx) => sum + (tx.value_eth || 0), 0);
  const totalSentEth = outgoing.reduce((sum, tx) => sum + (tx.value_eth || 0), 0);

  // Build per-token breakdown
  const tokenMap = new Map<string, { symbol: string; name: string; contract: string; total_in: number; total_out: number; tx_count: number }>();
  for (const tx of transactions) {
    if (tx.is_token_transfer && tx.token_symbol) {
      const key = tx.token_contract || tx.token_symbol;
      if (!tokenMap.has(key)) {
        tokenMap.set(key, { symbol: tx.token_symbol, name: tx.token_name || tx.token_symbol, contract: tx.token_contract || '', total_in: 0, total_out: 0, tx_count: 0 });
      }
      const entry = tokenMap.get(key)!;
      entry.tx_count++;
      if (tx.direction === 'incoming') {
        entry.total_in += tx.token_value || 0;
      } else {
        entry.total_out += tx.token_value || 0;
      }
    }
  }
  const tokenSummary = Array.from(tokenMap.values()).sort((a, b) => b.tx_count - a.tx_count);

  const firstTx = transactions.length > 0
    ? transactions.reduce((a, b) => a.time < b.time ? a : b)
    : null;
  const lastTx = transactions.length > 0
    ? transactions.reduce((a, b) => a.time > b.time ? a : b)
    : null;

  const summary: WalletSummary = {
    address,
    chain: 'ethereum',
    n_tx: transactions.length,
    final_balance_wei: balanceWei,
    final_balance_eth: weiToETH(balanceWei),
    total_received_eth: Number(totalReceivedEth.toFixed(18)),
    total_sent_eth: Number(totalSentEth.toFixed(18)),
    token_summary: tokenSummary.length > 0 ? tokenSummary : undefined,
    first_seen: firstTx ? firstTx.time_iso : undefined,
    last_seen: lastTx ? lastTx.time_iso : undefined,
    fetched_at: now,
  };

  await indexTransactionsAndSummary(address, transactions, summary);

  return {
    chain: 'ethereum',
    summary,
    transactions_fetched: transactions.length,
    sample_transactions: transactions.slice(0, 10).map(tx => ({
      tx_hash: tx.tx_hash,
      direction: tx.direction,
      value_eth: tx.value_eth,
      fee_eth: tx.fee_eth,
      time: tx.time_iso,
      from: tx.from_address,
      to: tx.to_address,
      ...(tx.is_token_transfer ? { token_symbol: tx.token_symbol, token_value: tx.token_value } : {}),
    })),
    execution_time_ms: Date.now() - startTime,
  };
}

async function indexTransactionsAndSummary(address: string, transactions: WalletTransaction[], summary: WalletSummary) {
  if (transactions.length > 0) {
    await esClient.deleteByQuery({
      index: WALLET_TX_INDEX,
      body: { query: { term: { address } } },
      refresh: true,
    }).catch(() => { /* index might be empty */ });

    const bulkOps = transactions.flatMap(tx => [
      { index: { _index: WALLET_TX_INDEX, _id: `${address}_${tx.tx_hash}` } },
      tx,
    ]);
    await esClient.bulk({ body: bulkOps, refresh: true });
  }

  await esClient.index({
    index: WALLET_SUMMARY_INDEX,
    id: address,
    body: summary,
    refresh: true,
  });
}

/**
 * Execute search_transactions: Query cached transactions in ES
 */
async function executeSearchTransactions(params: z.infer<typeof SearchTransactionsParamsSchema>) {
  const startTime = Date.now();
  const chain = detectChain(params.address);

  const mustClauses: any[] = [
    { term: { address: params.address } },
  ];

  if (params.direction) {
    mustClauses.push({ term: { direction: params.direction } });
  }

  if (chain === 'bitcoin') {
    if (params.min_value_btc !== undefined || params.max_value_btc !== undefined) {
      const range: any = {};
      if (params.min_value_btc !== undefined) range.gte = params.min_value_btc;
      if (params.max_value_btc !== undefined) range.lte = params.max_value_btc;
      mustClauses.push({ range: { value_btc: range } });
    }
  } else {
    if (params.min_value_eth !== undefined || params.max_value_eth !== undefined) {
      const range: any = {};
      if (params.min_value_eth !== undefined) range.gte = params.min_value_eth;
      if (params.max_value_eth !== undefined) range.lte = params.max_value_eth;
      mustClauses.push({ range: { value_eth: range } });
    }
  }

  if (params.time_range) {
    mustClauses.push({
      range: {
        time_iso: {
          gte: params.time_range.from,
          lte: params.time_range.to,
        },
      },
    });
  }

  const valueField = chain === 'bitcoin' ? 'value_btc' : 'value_eth';
  const sortField = params.sort_by === 'value' ? valueField : 'time';
  const sortOrder = params.sort_order || 'desc';

  const esQuery = {
    index: WALLET_TX_INDEX,
    body: {
      query: { bool: { must: mustClauses } },
      sort: [{ [sortField]: sortOrder }],
      size: params.limit || 50,
    },
  };

  const response = await esClient.search(esQuery);
  const executionTime = Date.now() - startTime;

  const results = response.hits.hits.map((hit: any) => hit._source);
  const total = typeof response.hits.total === 'number'
    ? response.hits.total
    : response.hits.total?.value || 0;

  return {
    chain,
    results,
    total,
    elasticsearch_query: esQuery.body,
    execution_time_ms: executionTime,
  };
}

/**
 * Execute get_wallet_summary: Get cached summary from ES
 */
async function executeGetWalletSummary(params: z.infer<typeof GetWalletSummaryParamsSchema>) {
  const startTime = Date.now();

  try {
    const response = await esClient.get({
      index: WALLET_SUMMARY_INDEX,
      id: params.address,
    });

    return {
      summary: response._source,
      found: true,
      execution_time_ms: Date.now() - startTime,
    };
  } catch (error: any) {
    if (error.statusCode === 404 || error.meta?.statusCode === 404) {
      return {
        summary: null,
        found: false,
        message: `No cached data for address ${params.address}. Call fetch_wallet_data first.`,
        execution_time_ms: Date.now() - startTime,
      };
    }
    throw error;
  }
}

/**
 * Execute detect_anomalies: Analyze cached transactions for suspicious patterns
 */
async function executeDetectAnomalies(params: z.infer<typeof DetectAnomaliesParamsSchema>) {
  const startTime = Date.now();
  const sensitivity = params.sensitivity || 'medium';

  const response = await esClient.search({
    index: WALLET_TX_INDEX,
    body: {
      query: { term: { address: params.address } },
      sort: [{ time: 'asc' }],
      size: 10000,
    },
  });

  const transactions = response.hits.hits.map((hit: any) => hit._source as WalletTransaction);

  if (transactions.length === 0) {
    return {
      anomalies: [],
      message: `No cached transactions for ${params.address}. Call fetch_wallet_data first.`,
      execution_time_ms: Date.now() - startTime,
    };
  }

  const chain = transactions[0].chain || detectChain(params.address);
  const getValueField = (tx: WalletTransaction): number => {
    return chain === 'bitcoin' ? (tx.value_btc || 0) : (tx.value_eth || 0);
  };
  const unit = chain === 'bitcoin' ? 'BTC' : 'ETH';

  const thresholds = {
    low: { stddevMultiplier: 3, rapidWindowMin: 5, dormantDays: 180, fanThreshold: 10 },
    medium: { stddevMultiplier: 2, rapidWindowMin: 10, dormantDays: 90, fanThreshold: 5 },
    high: { stddevMultiplier: 1.5, rapidWindowMin: 30, dormantDays: 30, fanThreshold: 3 },
  }[sensitivity];

  const anomalies: any[] = [];

  // 1. Large transactions
  const values = transactions.map(getValueField);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stddev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
  const largeThreshold = mean + thresholds.stddevMultiplier * stddev;

  const largeTxs = transactions.filter(tx => getValueField(tx) > largeThreshold && getValueField(tx) > 0.01);
  if (largeTxs.length > 0) {
    anomalies.push({
      type: 'large_transaction',
      severity: 'high',
      description: `${largeTxs.length} transaction(s) significantly larger than average (>${largeThreshold.toFixed(4)} ${unit}, avg: ${mean.toFixed(4)} ${unit})`,
      flagged_transactions: largeTxs.slice(0, 5).map(tx => ({
        tx_hash: tx.tx_hash, value: getValueField(tx), unit, direction: tx.direction, time: tx.time_iso,
      })),
    });
  }

  // 2. Rapid sequences (potential mixing)
  const rapidGroups: WalletTransaction[][] = [];
  let currentGroup: WalletTransaction[] = [transactions[0]];
  for (let i = 1; i < transactions.length; i++) {
    const timeDiff = (transactions[i].time - transactions[i - 1].time) / 60;
    if (timeDiff <= thresholds.rapidWindowMin) {
      currentGroup.push(transactions[i]);
    } else {
      if (currentGroup.length >= 3) rapidGroups.push([...currentGroup]);
      currentGroup = [transactions[i]];
    }
  }
  if (currentGroup.length >= 3) rapidGroups.push(currentGroup);

  if (rapidGroups.length > 0) {
    anomalies.push({
      type: 'rapid_sequence',
      severity: 'medium',
      description: `${rapidGroups.length} cluster(s) of rapid transactions (3+ within ${thresholds.rapidWindowMin} min). Could indicate mixing or automated activity.`,
      flagged_transactions: rapidGroups[0].slice(0, 5).map(tx => ({
        tx_hash: tx.tx_hash, value: getValueField(tx), unit, direction: tx.direction, time: tx.time_iso,
      })),
    });
  }

  // 3. Round-number transactions
  const roundTxs = transactions.filter(tx => {
    const val = getValueField(tx);
    if (chain === 'bitcoin') {
      return val >= 0.1 && (val % 0.1 < 0.0001 || (0.1 - val % 0.1) < 0.0001);
    } else {
      return val >= 0.1 && (val % 0.1 < 0.001 || (0.1 - val % 0.1) < 0.001);
    }
  });
  if (roundTxs.length >= 3) {
    anomalies.push({
      type: 'round_numbers',
      severity: 'low',
      description: `${roundTxs.length} transactions with round ${unit} values. Could indicate structured payments.`,
      flagged_transactions: roundTxs.slice(0, 5).map(tx => ({
        tx_hash: tx.tx_hash, value: getValueField(tx), unit, direction: tx.direction, time: tx.time_iso,
      })),
    });
  }

  // 4. Dormant reactivation
  for (let i = 1; i < transactions.length; i++) {
    const gapDays = (transactions[i].time - transactions[i - 1].time) / 86400;
    if (gapDays >= thresholds.dormantDays) {
      anomalies.push({
        type: 'dormant_reactivation',
        severity: 'high',
        description: `Wallet was dormant for ${Math.round(gapDays)} days then became active again.`,
        flagged_transactions: [
          { tx_hash: transactions[i - 1].tx_hash, value: getValueField(transactions[i - 1]), unit, direction: transactions[i - 1].direction, time: transactions[i - 1].time_iso, note: 'last before dormancy' },
          { tx_hash: transactions[i].tx_hash, value: getValueField(transactions[i]), unit, direction: transactions[i].direction, time: transactions[i].time_iso, note: 'first after dormancy' },
        ],
      });
      break;
    }
  }

  // 5. Fan-out patterns (Bitcoin-specific)
  if (chain === 'bitcoin') {
    const fanOutTxs = transactions.filter(tx => (tx.output_count || 0) >= thresholds.fanThreshold);
    if (fanOutTxs.length > 0) {
      anomalies.push({
        type: 'fan_out',
        severity: 'medium',
        description: `${fanOutTxs.length} transaction(s) with ${thresholds.fanThreshold}+ outputs. Could indicate distribution or mixing.`,
        flagged_transactions: fanOutTxs.slice(0, 5).map(tx => ({
          tx_hash: tx.tx_hash, value: getValueField(tx), unit, output_count: tx.output_count, direction: tx.direction, time: tx.time_iso,
        })),
      });
    }

    const fanInTxs = transactions.filter(tx => (tx.input_count || 0) >= thresholds.fanThreshold);
    if (fanInTxs.length > 0) {
      anomalies.push({
        type: 'fan_in',
        severity: 'medium',
        description: `${fanInTxs.length} transaction(s) with ${thresholds.fanThreshold}+ inputs. Could indicate consolidation before withdrawal.`,
        flagged_transactions: fanInTxs.slice(0, 5).map(tx => ({
          tx_hash: tx.tx_hash, value: getValueField(tx), unit, input_count: tx.input_count, direction: tx.direction, time: tx.time_iso,
        })),
      });
    }
  }

  // Ethereum-specific anomalies
  if (chain === 'ethereum') {
    const failedTxs = transactions.filter(tx => tx.is_error === true);
    if (failedTxs.length > 0) {
      anomalies.push({
        type: 'failed_transactions',
        severity: 'medium',
        description: `${failedTxs.length} failed transaction(s) detected. Could indicate contract interaction issues or insufficient gas.`,
        flagged_transactions: failedTxs.slice(0, 5).map(tx => ({
          tx_hash: tx.tx_hash, value: getValueField(tx), unit, direction: tx.direction, time: tx.time_iso,
        })),
      });
    }

    const gasValues = transactions.filter(tx => tx.gas_price_gwei).map(tx => tx.gas_price_gwei!);
    if (gasValues.length > 0) {
      const avgGas = gasValues.reduce((a, b) => a + b, 0) / gasValues.length;
      const highGasTxs = transactions.filter(tx => (tx.gas_price_gwei || 0) > avgGas * 3);
      if (highGasTxs.length > 0) {
        anomalies.push({
          type: 'high_gas_price',
          severity: 'low',
          description: `${highGasTxs.length} transaction(s) with gas price 3x above average (avg: ${avgGas.toFixed(2)} Gwei). Could indicate urgency or MEV activity.`,
          flagged_transactions: highGasTxs.slice(0, 5).map(tx => ({
            tx_hash: tx.tx_hash, gas_price_gwei: tx.gas_price_gwei, value: getValueField(tx), unit, time: tx.time_iso,
          })),
        });
      }
    }
  }

  return {
    address: params.address,
    chain,
    total_transactions_analyzed: transactions.length,
    anomalies,
    anomaly_count: anomalies.length,
    sensitivity,
    execution_time_ms: Date.now() - startTime,
  };
}

/**
 * Tool executor - Routes tool calls to the appropriate function
 */
export async function executeTool(toolName: string, args: any) {
  switch (toolName) {
    case 'fetch_wallet_data': {
      const params = FetchWalletParamsSchema.parse(args);
      return await executeFetchWalletData(params);
    }
    case 'search_transactions': {
      const params = SearchTransactionsParamsSchema.parse(args);
      return await executeSearchTransactions(params);
    }
    case 'get_wallet_summary': {
      const params = GetWalletSummaryParamsSchema.parse(args);
      return await executeGetWalletSummary(params);
    }
    case 'detect_anomalies': {
      const params = DetectAnomaliesParamsSchema.parse(args);
      return await executeDetectAnomalies(params);
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
