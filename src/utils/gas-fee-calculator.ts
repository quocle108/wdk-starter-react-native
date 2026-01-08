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
    spark: 'spark',
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
  _tokenId: string,
  _amount?: number
): Promise<GasFeeEstimate> => {
  const networkType = getNetworkType(networkId);

  const defaultFees: Record<NetworkType, number> = {
    ethereum: 0.001,
    polygon: 0.0001,
    arbitrum: 0.0001,
    spark: 0.00001,
  };

  return {
    fee: defaultFees[networkType] || 0.001,
  };
};
