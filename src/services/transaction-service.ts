/**
 * Transaction Service
 *
 * Fetches transaction history from WDK Indexer API
 */

const INDEXER_BASE_URL = process.env.EXPO_PUBLIC_WDK_INDEXER_BASE_URL || 'https://wdk-api.tether.io';
const INDEXER_API_KEY = process.env.EXPO_PUBLIC_WDK_INDEXER_API_KEY || '';

export interface TokenTransfer {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  token: string;
  network: string;
}

export interface TokenTransferOptions {
  limit?: number;
  offset?: number;
}

// Networks supported by the indexer (excludes testnets like sepolia, spark regtest)
export const SUPPORTED_INDEXER_NETWORKS = ['ethereum', 'polygon', 'arbitrum', 'plasma'] as const;
export type IndexerNetwork = typeof SUPPORTED_INDEXER_NETWORKS[number];

// Token mapping for each network
export const NETWORK_TOKEN_MAP: Record<IndexerNetwork, string[]> = {
  ethereum: ['usdt', 'xaut'],
  polygon: ['usdt'],
  arbitrum: ['usdt'],
  plasma: ['usdt'],
};

/**
 * Fetch token transfers for a specific network/token/address
 */
export async function getTokenTransfers(
  network: string,
  token: string,
  address: string,
  options?: TokenTransferOptions
): Promise<TokenTransfer[]> {
  if (!address) return [];

  const params = new URLSearchParams({
    network,
    token,
    address,
    limit: String(options?.limit || 20),
    offset: String(options?.offset || 0),
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (INDEXER_API_KEY) {
    headers['x-api-key'] = INDEXER_API_KEY;
  }

  try {
    const response = await fetch(`${INDEXER_BASE_URL}/v1/transfers?${params}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.warn(`[TransactionService] Failed to fetch transfers for ${network}/${token}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Transform response to our format
    return (data.transfers || []).map((transfer: any) => ({
      transactionHash: transfer.transactionHash || transfer.hash,
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timestamp,
      from: transfer.from || '',
      to: transfer.to || '',
      amount: transfer.amount || transfer.value || '0',
      token,
      network,
    }));
  } catch (error) {
    console.warn(`[TransactionService] Error fetching transfers for ${network}/${token}:`, error);
    return [];
  }
}

/**
 * Fetch transfers for all supported networks for a given address map
 */
export async function getAllTransfers(
  addresses: Record<string, string>,
  options?: TokenTransferOptions
): Promise<TokenTransfer[]> {
  const promises: Promise<TokenTransfer[]>[] = [];

  for (const network of SUPPORTED_INDEXER_NETWORKS) {
    const address = addresses[network];
    if (!address) continue;

    const tokens = NETWORK_TOKEN_MAP[network];
    for (const token of tokens) {
      promises.push(getTokenTransfers(network, token, address, options));
    }
  }

  const results = await Promise.all(promises);
  const allTransfers = results.flat();

  // Sort by timestamp descending (newest first)
  return allTransfers.sort((a, b) => b.timestamp - a.timestamp);
}
