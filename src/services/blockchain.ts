/**
 * Blockchain.info API Client
 * Fetches Bitcoin wallet data with rate limiting and validation
 */

import { z } from 'zod';

// Response schema from blockchain.info/rawaddr
const BlockchainTxSchema = z.object({
  hash: z.string(),
  ver: z.number().optional(),
  size: z.number().optional(),
  weight: z.number().optional(),
  fee: z.number().default(0),
  time: z.number(),
  block_height: z.number().optional(),
  result: z.number(),
  balance: z.number().optional(),
  inputs: z.array(z.object({
    prev_out: z.object({
      addr: z.string().optional(),
      value: z.number(),
      spent: z.boolean().optional(),
    }).optional(),
  })).default([]),
  out: z.array(z.object({
    addr: z.string().optional(),
    value: z.number(),
    spent: z.boolean().optional(),
  })).default([]),
});

const BlockchainAddressResponseSchema = z.object({
  hash160: z.string().optional(),
  address: z.string(),
  n_tx: z.number(),
  n_unredeemed: z.number().optional(),
  total_received: z.number(),
  total_sent: z.number(),
  final_balance: z.number(),
  txs: z.array(BlockchainTxSchema).default([]),
});

export type BlockchainAddressResponse = z.infer<typeof BlockchainAddressResponseSchema>;
export type BlockchainTx = z.infer<typeof BlockchainTxSchema>;

const BLOCKCHAIN_API_BASE = 'https://blockchain.info';
const RATE_LIMIT_DELAY_MS = 600;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

/**
 * Fetch wallet data from blockchain.info
 */
export async function fetchWalletFromBlockchain(
  address: string,
  limit: number = 50,
  offset: number = 0,
): Promise<BlockchainAddressResponse> {
  const url = `${BLOCKCHAIN_API_BASE}/rawaddr/${address}?limit=${limit}&offset=${offset}`;

  const response = await rateLimitedFetch(url);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limited by blockchain.info API. Please try again shortly.');
    }
    if (response.status === 500 || response.status === 400) {
      throw new Error(`Invalid Bitcoin address or blockchain.info API error for: ${address}`);
    }
    throw new Error(`Blockchain API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return BlockchainAddressResponseSchema.parse(data);
}

/**
 * Convert satoshis to BTC
 */
export function satoshiToBTC(satoshis: number): number {
  return Number((satoshis / 100_000_000).toFixed(8));
}

/**
 * Detect blockchain from address format
 * - Bitcoin: starts with 1, 3, or bc1
 * - Ethereum: starts with 0x and is 42 chars
 */
export function detectChain(address: string): 'bitcoin' | 'ethereum' {
  if (address.startsWith('0x') && address.length === 42) {
    return 'ethereum';
  }
  if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) {
    return 'bitcoin';
  }
  throw new Error(`Unable to detect chain for address: ${address}. Bitcoin addresses start with 1, 3, or bc1. Ethereum addresses start with 0x.`);
}
