import {
  validateEvmAddress,
  validateBitcoinAddress,
  AddressValidator,
} from '@/utils/address-validators';

export type NetworkType = 'ethereum' | 'polygon' | 'arbitrum' | 'spark';

export interface Network {
  id: string;
  name: string;
  gasLevel: 'High' | 'Normal' | 'Low';
  gasColor: string;
  icon: string | any;
  color: string;
  addressValidator?: AddressValidator;
}

export const networkConfigs: Record<NetworkType, Network> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    gasLevel: 'High',
    gasColor: '#FF3B30',
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#627EEA',
    addressValidator: validateEvmAddress,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/polygon-matic-logo.png'),
    color: '#8247E5',
    addressValidator: validateEvmAddress,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    gasLevel: 'Normal',
    gasColor: '#FF9500',
    icon: require('../../assets/images/chains/arbitrum-arb-logo.png'),
    color: '#28A0F0',
    addressValidator: validateEvmAddress,
  },
  spark: {
    id: 'spark',
    name: 'Spark',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/bitcoin-btc-logo.png'),
    color: '#F7931A',
    addressValidator: validateBitcoinAddress,
  },
};
