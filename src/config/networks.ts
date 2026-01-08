import {
  validateEvmAddress,
  validateBitcoinAddress,
  validateTonAddress,
  validateTronAddress,
  validateSolanaAddress,
  AddressValidator,
} from '@/utils/address-validators';

export type NetworkType =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'ton'
  | 'tron'
  | 'solana'
  | 'bitcoin'
  | 'lightning'
  | 'spark';

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
  ton: {
    id: 'ton',
    name: 'TON',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/ton-logo.png'),
    color: '#0088CC',
    addressValidator: validateTonAddress,
  },
  tron: {
    id: 'tron',
    name: 'Tron',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/tron-trx-logo.png'),
    color: '#FF060A',
    addressValidator: validateTronAddress,
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/solana-sol-logo.png'),
    color: '#9945FF',
    addressValidator: validateSolanaAddress,
  },
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    gasLevel: 'Normal',
    gasColor: '#FF9500',
    icon: require('../../assets/images/chains/bitcoin-btc-logo.png'),
    color: '#F7931A',
    addressValidator: validateBitcoinAddress,
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/lightning-logo.png'),
    color: '#F7CA3E',
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
