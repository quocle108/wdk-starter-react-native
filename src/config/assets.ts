import { FiatCurrency } from '@/services/pricing-service';
import { NetworkType } from '@/config/networks';

export interface AssetConfig {
  name: string;
  symbol: string;
  icon: any;
  color: string;
  supportedNetworks: NetworkType[];
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  amount: string;
  fiatValue: number;
  fiatCurrency: FiatCurrency;
  icon: string | any;
  color: string;
}

export type AssetTicker = 'btc' | 'usdt' | 'xaut' | 'eth' | 'matic' | 'ton' | 'trx';

export const assetConfig: Record<string, AssetConfig> = {
  btc: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: require('../../assets/images/tokens/bitcoin-btc-logo.png'),
    color: '#ffffff',
    supportedNetworks: ['bitcoin'],
  },
  usdt: {
    name: 'USD₮',
    symbol: 'USD₮',
    icon: require('../../assets/images/tokens/tether-usdt-logo.png'),
    color: '#ffffff',
    // Only include networks that exist in getChainsConfig (SDK supported)
    supportedNetworks: ['ethereum', 'polygon', 'arbitrum'],
  },
  xaut: {
    name: 'XAU₮',
    symbol: 'XAU₮',
    icon: require('../../assets/images/tokens/tether-xaut-logo.png'),
    color: '#ffffff',
    supportedNetworks: ['ethereum'],
  },
};
