/**
 * Etherscan API Client
 * Fetches Ethereum wallet data with rate limiting and validation
 */

import { z } from 'zod';

const ETHERSCAN_API_BASE = 'https://api.etherscan.io/v2/api';
const RATE_LIMIT_DELAY_MS = 200; // 5 calls/sec on free tier

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

function getApiKey(): string {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) {
    throw new Error('ETHERSCAN_API_KEY is not set in .env file. Get a free key at https://etherscan.io/apis');
  }
  return key;
}

// Etherscan response schemas
const EtherscanBaseResponseSchema = z.object({
  status: z.string(),
  message: z.string(),
});

const EtherscanBalanceResponseSchema = EtherscanBaseResponseSchema.extend({
  result: z.string(), // balance in wei as string
});

const EtherscanTxSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(), // wei as string
  gas: z.string(),
  gasPrice: z.string(),
  gasUsed: z.string(),
  isError: z.string(),
  txreceipt_status: z.string().optional(),
  input: z.string().optional(),
  contractAddress: z.string().optional(),
  nonce: z.string().optional(),
  blockHash: z.string().optional(),
  transactionIndex: z.string().optional(),
  cumulativeGasUsed: z.string().optional(),
  confirmations: z.string().optional(),
  functionName: z.string().optional(),
  methodId: z.string().optional(),
});

const EtherscanTxListResponseSchema = EtherscanBaseResponseSchema.extend({
  result: z.union([z.array(EtherscanTxSchema), z.string()]), // string when error/no results
});

export type EtherscanTx = z.infer<typeof EtherscanTxSchema>;

/**
 * Fetch ETH balance for an address
 */
export async function fetchEthBalance(address: string): Promise<string> {
  const apiKey = getApiKey();
  const url = `${ETHERSCAN_API_BASE}?chainid=1&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;

  const response = await rateLimitedFetch(url);
  if (!response.ok) {
    throw new Error(`Etherscan API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = EtherscanBalanceResponseSchema.parse(data);

  if (parsed.status !== '1' && parsed.message !== 'OK') {
    throw new Error(`Etherscan API error: ${parsed.message} - ${parsed.result}`);
  }

  return parsed.result;
}

/**
 * Fetch normal transactions for an address
 */
export async function fetchEthTransactions(
  address: string,
  page: number = 1,
  offset: number = 50,
  sort: 'asc' | 'desc' = 'desc',
): Promise<EtherscanTx[]> {
  const apiKey = getApiKey();
  const url = `${ETHERSCAN_API_BASE}?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=${sort}&apikey=${apiKey}`;

  const response = await rateLimitedFetch(url);
  if (!response.ok) {
    throw new Error(`Etherscan API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = EtherscanTxListResponseSchema.parse(data);

  if (parsed.status !== '1') {
    // "No transactions found" is not an error
    if (parsed.message === 'No transactions found') {
      return [];
    }
    if (typeof parsed.result === 'string') {
      throw new Error(`Etherscan API error: ${parsed.result}`);
    }
  }

  if (typeof parsed.result === 'string') {
    return [];
  }

  return parsed.result;
}

/**
 * Convert wei to ETH
 */
export function weiToETH(wei: string | number): number {
  const weiStr = typeof wei === 'number' ? wei.toString() : wei;
  // Handle large numbers by splitting into parts
  const weiBigInt = BigInt(weiStr);
  const ethValue = Number(weiBigInt) / 1e18;
  return Number(ethValue.toFixed(18));
}
