/**
 * useTransactions Hook
 *
 * Fetches transaction history using WDK Indexer API with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getAllTransfers,
  TokenTransfer,
  SUPPORTED_INDEXER_NETWORKS,
} from '@/services/transaction-service';

export interface TransactionData {
  id: string;
  type: 'sent' | 'received';
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  token: string;
  network: string;
}

interface UseTransactionsOptions {
  enabled?: boolean;
  limit?: number;
}

/**
 * Transform raw transfer to transaction display format
 */
function transformTransfer(
  transfer: TokenTransfer,
  walletAddresses: string[]
): TransactionData {
  const fromLower = transfer.from.toLowerCase();
  const isSent = walletAddresses.some(addr => addr.toLowerCase() === fromLower);

  return {
    id: `${transfer.transactionHash}-${transfer.network}-${transfer.token}`,
    type: isSent ? 'sent' : 'received',
    hash: transfer.transactionHash,
    timestamp: transfer.timestamp,
    from: transfer.from,
    to: transfer.to,
    amount: transfer.amount,
    token: transfer.token,
    network: transfer.network,
  };
}

/**
 * Hook to fetch all transactions for wallet addresses
 */
export function useTransactions(
  addresses: Record<string, string> | undefined,
  options: UseTransactionsOptions = {}
) {
  const { enabled = true, limit = 50 } = options;

  // Get list of wallet addresses for determining sent/received
  const walletAddresses = useMemo(() => {
    if (!addresses) return [];
    return Object.values(addresses).filter(Boolean);
  }, [addresses]);

  // Check if we have any supported network addresses
  const hasAddresses = useMemo(() => {
    if (!addresses) return false;
    return SUPPORTED_INDEXER_NETWORKS.some(network => !!addresses[network]);
  }, [addresses]);

  const query = useQuery({
    queryKey: ['transactions', 'all', addresses, limit],
    queryFn: async () => {
      if (!addresses) return [];

      // 10-second timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Transaction fetch timeout')), 10000);
      });

      const transfers = await Promise.race([
        getAllTransfers(addresses, { limit }),
        timeoutPromise,
      ]);

      return transfers;
    },
    enabled: enabled && hasAddresses,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2,
    retryDelay: 1000,
  });

  // Transform transfers to transaction format
  const transactions = useMemo<TransactionData[]>(() => {
    if (!query.data) return [];
    return query.data.map(transfer => transformTransfer(transfer, walletAddresses));
  }, [query.data, walletAddresses]);

  return {
    transactions,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
