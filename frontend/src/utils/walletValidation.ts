export type ChainType = 'bitcoin' | 'ethereum';

export interface ValidationResult {
  valid: boolean;
  chain?: ChainType;
  address?: string;
  error?: string;
}

const WALLET_PATTERNS = {
  bitcoin: /^(1|3|bc1)[a-km-zA-HJ-NP-Z1-9]{25,62}$/,
  ethereum: /^0x[a-fA-F0-9]{40}$/,
};

export function validateWallet(input: string): ValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: 'Please enter a wallet address',
    };
  }

  // Check Bitcoin
  if (WALLET_PATTERNS.bitcoin.test(trimmed)) {
    return {
      valid: true,
      chain: 'bitcoin',
      address: trimmed,
    };
  }

  // Check Ethereum
  if (WALLET_PATTERNS.ethereum.test(trimmed)) {
    return {
      valid: true,
      chain: 'ethereum',
      address: trimmed,
    };
  }

  return {
    valid: false,
    error: 'Invalid wallet format. Must be Bitcoin (1/3/bc1...) or Ethereum (0x...)',
  };
}

export function detectChain(input: string): ChainType | null {
  const trimmed = input.trim();

  if (WALLET_PATTERNS.bitcoin.test(trimmed)) {
    return 'bitcoin';
  }

  if (WALLET_PATTERNS.ethereum.test(trimmed)) {
    return 'ethereum';
  }

  // Partial detection for live feedback
  if (trimmed.startsWith('1') || trimmed.startsWith('3') || trimmed.startsWith('bc1')) {
    return 'bitcoin';
  }

  if (trimmed.startsWith('0x')) {
    return 'ethereum';
  }

  return null;
}
