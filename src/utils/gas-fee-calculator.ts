import { NetworkType } from '@/config/networks';
import { AssetTicker } from '@/config/assets';

export interface GasFeeEstimate {
  fee?: number;
  error?: string;
}

export const getNetworkType = (networkId: string): NetworkType => {
  const networkMap: Record<string, NetworkType> = {
    ethereum: 'ethereum',
    polygon: 'polygon',
    arbitrum: 'arbitrum',
    bitcoin: 'bitcoin',
    lightning: 'lightning',
    ton: 'ton',
    tron: 'tron',
    solana: 'solana',
  };
  return networkMap[networkId] || 'ethereum';
};

export const getAssetTicker = (tokenId: string): AssetTicker => {
  const assetMap: Record<string, AssetTicker> = {
    btc: 'btc',
    usdt: 'usdt',
    xaut: 'xaut',
  };
  return assetMap[tokenId?.toLowerCase()] || 'usdt';
};

export const calculateGasFee = async (
  networkId: string,
  tokenId: string,
  _amount?: number
): Promise<GasFeeEstimate> => {
  const networkType = getNetworkType(networkId);

  if (networkType === 'bitcoin' && !_amount) {
    return {
      fee: undefined,
      error: 'Insufficient balance for fee calculation',
    };
  }

  const defaultFees: Record<NetworkType, number> = {
    ethereum: 0.001,
    polygon: 0.0001,
    arbitrum: 0.0001,
    bitcoin: 0.00001,
    lightning: 0.000001,
    ton: 0.05,
    tron: 1,
    solana: 0.00001,
  };

  return {
    fee: defaultFees[networkType] || 0.001,
  };
};
