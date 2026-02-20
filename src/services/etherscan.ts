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

const EtherscanTokenTxSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(), // token amount in smallest unit
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenDecimal: z.string(),
  contractAddress: z.string(),
  gas: z.string().optional(),
  gasPrice: z.string().optional(),
  gasUsed: z.string().optional(),
  nonce: z.string().optional(),
  confirmations: z.string().optional(),
});

const EtherscanTokenTxListResponseSchema = EtherscanBaseResponseSchema.extend({
  result: z.union([z.array(EtherscanTokenTxSchema), z.string()]),
});

export type EtherscanTokenTx = z.infer<typeof EtherscanTokenTxSchema>;

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
 * Fetch ERC-20 token transfers for an address
 */
export async function fetchEthTokenTransactions(
  address: string,
  page: number = 1,
  offset: number = 100,
  sort: 'asc' | 'desc' = 'desc',
): Promise<EtherscanTokenTx[]> {
  const apiKey = getApiKey();
  const url = `${ETHERSCAN_API_BASE}?chainid=1&module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=${sort}&apikey=${apiKey}`;

  const response = await rateLimitedFetch(url);
  if (!response.ok) {
    throw new Error(`Etherscan API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const parsed = EtherscanTokenTxListResponseSchema.parse(data);

  if (parsed.status !== '1') {
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
 * Convert token value from smallest unit to human-readable using token decimals
 */
export function tokenToDecimal(value: string, decimals: string | number): number {
  const dec = typeof decimals === 'string' ? parseInt(decimals, 10) : decimals;
  if (dec === 0) return Number(value);
  try {
    const valueBigInt = BigInt(value);
    const result = Number(valueBigInt) / Math.pow(10, dec);
    // Guard against Infinity/NaN from absurdly large token values (common in scam tokens)
    if (!isFinite(result) || isNaN(result)) return 0;
    return result;
  } catch {
    // BigInt conversion can fail on malformed values
    return 0;
  }
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

/**
 * Fetch USD prices for ETH and token contract addresses from CoinGecko
 * Returns a map of lowercase contract address -> USD price, plus 'eth' -> ETH price
 */
export async function fetchTokenPricesUSD(contractAddresses: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  try {
    // Fetch ETH price
    const ethRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    if (ethRes.ok) {
      const ethData = await ethRes.json();
      if (ethData.ethereum?.usd) {
        prices.set('eth', ethData.ethereum.usd);
      }
    }

    // Fetch token prices by contract address
    if (contractAddresses.length > 0) {
      const contracts = contractAddresses.map(a => a.toLowerCase()).join(',');
      const tokenRes = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${contracts}&vs_currencies=usd`);
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        for (const [addr, priceObj] of Object.entries(tokenData)) {
          if ((priceObj as any)?.usd) {
            prices.set(addr.toLowerCase(), (priceObj as any).usd);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch USD prices:', error);
  }

  return prices;
}
