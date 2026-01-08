import Header from '@/components/header';
import { assetConfig } from '@/config/assets';
import { Network, networkConfigs } from '@/config/networks';
import { NetworkType } from '@/config/networks';
import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import React, { useCallback, useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

interface NetworkOption extends Network {
  address?: string;
  hasAddress: boolean;
  description?: string;
}

const NETWORK_DESCRIPTIONS: Record<string, string> = {
  ethereum: 'ERC20',
  polygon: 'Polygon Network',
  arbitrum: 'Arbitrum One',
  ton: 'TON Network',
  tron: 'Tron Network',
  solana: 'Solana Network',
  bitcoin: 'Native Bitcoin Network',
  lightning: 'Lightning Network',
};

export default function ReceiveSelectNetworkScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { addresses } = useWallet({ walletId: currentWalletId });
  const params = useLocalSearchParams();

  const { tokenId, tokenSymbol, tokenName } = params as {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
  };

  const networks: NetworkOption[] = useMemo(() => {
    const tokenConfig = assetConfig[tokenId as keyof typeof assetConfig];
    if (!tokenConfig) {
      return [];
    }

    return tokenConfig.supportedNetworks.map((networkType: NetworkType) => {
      const network = networkConfigs[networkType];
      const addressData = addresses?.[networkType];
      // addresses is Record<string, string[]> - get first address from array
      const address = Array.isArray(addressData)
        ? addressData[0]
        : typeof addressData === 'string'
          ? addressData
          : undefined;

      return {
        ...network,
        address,
        hasAddress: Boolean(address),
        description: NETWORK_DESCRIPTIONS[network.id],
      };
    });
  }, [tokenId, addresses]);

  const handleSelectNetwork = useCallback(
    (network: NetworkOption) => {
      if (!network.hasAddress) {
        return; // Don't allow selection if no address available
      }

      router.push({
        pathname: '/receive/details',
        params: {
          tokenId,
          tokenSymbol,
          tokenName,
          networkId: network.id,
          networkName: network.name,
          address: network.address,
        },
      });
    },
    [router, tokenId, tokenSymbol, tokenName]
  );

  const renderNetwork = ({ item }: { item: NetworkOption }) => {
    const isDisabled = !item.hasAddress;

    return (
      <TouchableOpacity
        style={[styles.networkRow, isDisabled && styles.networkRowDisabled]}
        onPress={() => handleSelectNetwork(item)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={styles.networkInfo}>
          <View
            style={[
              styles.networkIcon,
              { backgroundColor: item.color },
              isDisabled && styles.networkIconDisabled,
            ]}
          >
            {typeof item.icon === 'string' ? (
              <Text style={[styles.networkIconText, isDisabled && styles.networkIconTextDisabled]}>
                {item.icon}
              </Text>
            ) : (
              <Image
                source={item.icon}
                style={[styles.networkIconImage, isDisabled && styles.networkIconImageDisabled]}
              />
            )}
          </View>
          <View style={styles.networkDetails}>
            <Text style={[styles.networkName, isDisabled && styles.networkNameDisabled]}>
              {item.name}
            </Text>
            {item.description && (
              <Text
                style={[styles.networkDescription, isDisabled && styles.networkDescriptionDisabled]}
              >
                {item.description}
              </Text>
            )}
            {isDisabled && <Text style={styles.noAddressLabel}>Address not available</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Select network" style={styles.header} />

      <View style={styles.description}>
        <Text style={styles.descriptionText}>
          Select the network you will be using to receive {tokenName}
        </Text>
      </View>

      <FlatList
        data={networks}
        renderItem={renderNetwork}
        keyExtractor={item => item.id}
        style={styles.networksList}
        contentContainerStyle={styles.networksContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 16,
  },
  description: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  networksList: {
    flex: 1,
  },
  networksContent: {
    paddingBottom: 20,
  },
  networkRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  networkRowDisabled: {
    opacity: 0.5,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  networkIconDisabled: {
    backgroundColor: colors.border,
  },
  networkIconText: {
    fontSize: 18,
    color: colors.white,
  },
  networkIconTextDisabled: {
    opacity: 0.6,
  },
  networkIconImage: {
    width: 24,
    height: 24,
  },
  networkIconImageDisabled: {
    opacity: 0.6,
  },
  networkDetails: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  networkNameDisabled: {
    color: colors.textTertiary,
  },
  networkDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  networkDescriptionDisabled: {
    color: colors.textDisabled,
  },
  noAddressLabel: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});
