/**
 * Wallet types and Elasticsearch index mappings
 * Stores Bitcoin and Ethereum wallet transaction data for analysis
 */

import { z } from 'zod';

export const WalletTransactionSchema = z.object({
  tx_hash: z.string(),
  address: z.string(),
  chain: z.enum(['bitcoin', 'ethereum']),
  time: z.number(),
  time_iso: z.string(),
  direction: z.enum(['incoming', 'outgoing']),
  // Bitcoin fields
  fee_satoshis: z.number().optional(),
  fee_btc: z.number().optional(),
  result_satoshis: z.number().optional(),
  result_btc: z.number().optional(),
  value_satoshis: z.number().optional(),
  value_btc: z.number().optional(),
  // Ethereum fields
  value_wei: z.string().optional(),
  value_eth: z.number().optional(),
  gas_used: z.number().optional(),
  gas_price_gwei: z.number().optional(),
  fee_eth: z.number().optional(),
  from_address: z.string().optional(),
  to_address: z.string().optional(),
  is_error: z.boolean().optional(),
  // Token transfer fields
  token_name: z.string().optional(),
  token_symbol: z.string().optional(),
  token_decimals: z.number().optional(),
  token_contract: z.string().optional(),
  token_value: z.number().optional(),
  token_value_raw: z.string().optional(),
  is_token_transfer: z.boolean().optional(),
  // Common fields
  input_addresses: z.array(z.string()).optional(),
  output_addresses: z.array(z.string()).optional(),
  input_count: z.number().optional(),
  output_count: z.number().optional(),
  block_height: z.number().optional(),
  fetched_at: z.string(),
});

export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;

export const WalletSummarySchema = z.object({
  address: z.string(),
  chain: z.enum(['bitcoin', 'ethereum']),
  n_tx: z.number(),
  // Bitcoin fields
  total_received_satoshis: z.number().optional(),
  total_received_btc: z.number().optional(),
  total_sent_satoshis: z.number().optional(),
  total_sent_btc: z.number().optional(),
  final_balance_satoshis: z.number().optional(),
  final_balance_btc: z.number().optional(),
  // Ethereum fields
  final_balance_wei: z.string().optional(),
  final_balance_eth: z.number().optional(),
  total_received_eth: z.number().optional(),
  total_sent_eth: z.number().optional(),
  // USD values
  eth_price_usd: z.number().optional(),
  total_received_usd: z.number().optional(),
  total_sent_usd: z.number().optional(),
  balance_usd: z.number().optional(),
  // Token breakdown
  token_summary: z.array(z.object({
    symbol: z.string(),
    name: z.string(),
    contract: z.string(),
    total_in: z.number(),
    total_out: z.number(),
    total_in_usd: z.number().optional(),
    total_out_usd: z.number().optional(),
    price_usd: z.number().optional(),
    tx_count: z.number(),
  })).optional(),
  // Common
  first_seen: z.string().optional(),
  last_seen: z.string().optional(),
  fetched_at: z.string(),
});

export type WalletSummary = z.infer<typeof WalletSummarySchema>;

export const WALLET_TX_INDEX_MAPPING = {
  mappings: {
    properties: {
      tx_hash: { type: 'keyword' as const },
      address: { type: 'keyword' as const },
      chain: { type: 'keyword' as const },
      time: { type: 'long' as const },
      time_iso: { type: 'date' as const },
      direction: { type: 'keyword' as const },
      // Bitcoin
      fee_satoshis: { type: 'long' as const },
      fee_btc: { type: 'double' as const },
      result_satoshis: { type: 'long' as const },
      result_btc: { type: 'double' as const },
      value_satoshis: { type: 'long' as const },
      value_btc: { type: 'double' as const },
      // Ethereum
      value_wei: { type: 'keyword' as const },
      value_eth: { type: 'double' as const },
      gas_used: { type: 'long' as const },
      gas_price_gwei: { type: 'double' as const },
      fee_eth: { type: 'double' as const },
      from_address: { type: 'keyword' as const },
      to_address: { type: 'keyword' as const },
      is_error: { type: 'boolean' as const },
      // Token transfers
      token_name: { type: 'keyword' as const },
      token_symbol: { type: 'keyword' as const },
      token_decimals: { type: 'integer' as const },
      token_contract: { type: 'keyword' as const },
      token_value: { type: 'double' as const },
      token_value_raw: { type: 'keyword' as const },
      is_token_transfer: { type: 'boolean' as const },
      // Common
      input_addresses: { type: 'keyword' as const },
      output_addresses: { type: 'keyword' as const },
      input_count: { type: 'integer' as const },
      output_count: { type: 'integer' as const },
      block_height: { type: 'long' as const },
      fetched_at: { type: 'date' as const },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    refresh_interval: '1s',
  },
};

export const WALLET_SUMMARY_INDEX_MAPPING = {
  mappings: {
    properties: {
      address: { type: 'keyword' as const },
      chain: { type: 'keyword' as const },
      n_tx: { type: 'integer' as const },
      // Bitcoin
      total_received_satoshis: { type: 'long' as const },
      total_received_btc: { type: 'double' as const },
      total_sent_satoshis: { type: 'long' as const },
      total_sent_btc: { type: 'double' as const },
      final_balance_satoshis: { type: 'long' as const },
      final_balance_btc: { type: 'double' as const },
      // Ethereum
      final_balance_wei: { type: 'keyword' as const },
      final_balance_eth: { type: 'double' as const },
      total_received_eth: { type: 'double' as const },
      total_sent_eth: { type: 'double' as const },
      // USD values
      eth_price_usd: { type: 'double' as const },
      total_received_usd: { type: 'double' as const },
      total_sent_usd: { type: 'double' as const },
      balance_usd: { type: 'double' as const },
      // Token breakdown
      token_summary: {
        type: 'nested' as const,
        properties: {
          symbol: { type: 'keyword' as const },
          name: { type: 'keyword' as const },
          contract: { type: 'keyword' as const },
          total_in: { type: 'double' as const },
          total_out: { type: 'double' as const },
          total_in_usd: { type: 'double' as const },
          total_out_usd: { type: 'double' as const },
          price_usd: { type: 'double' as const },
          tx_count: { type: 'integer' as const },
        },
      },
      // Common
      first_seen: { type: 'date' as const },
      last_seen: { type: 'date' as const },
      fetched_at: { type: 'date' as const },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    refresh_interval: '1s',
  },
};
