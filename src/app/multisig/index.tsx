import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { getNetworkMode, NetworkMode } from '@/services/network-mode-service';
import { multisigService, StoredSafe } from '@/services/multisig-service';
import { getMultisigNetworks, getMultisigNetworkConfig, MultisigNetworkType } from '@/config/multisig-config';
import { networkConfigs } from '@/config/networks';
import { useFocusEffect } from 'expo-router';
import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import { Plus, Shield, ChevronRight, Copy, Wallet } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import * as Clipboard from 'expo-clipboard';

export default function MultisigListScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { addresses, isInitialized } = useWallet({ walletId: currentWalletId });

  const [safes, setSafes] = useState<StoredSafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('mainnet');
  const [signerAddress, setSignerAddress] = useState<string>('');
  const [signerBalance, setSignerBalance] = useState<string>('0.00');
  const [selectedNetwork, setSelectedNetwork] = useState<MultisigNetworkType | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          const mode = await getNetworkMode();
          setNetworkMode(mode);
          const allowedNetworks = getMultisigNetworks(mode);

          if (allowedNetworks.length > 0) {
            setSelectedNetwork(allowedNetworks[0]);
          }

          const allSafes = await multisigService.getSafes();
          const filteredSafes = allSafes.filter((safe) =>
            allowedNetworks.includes(safe.network)
          );
          setSafes(filteredSafes);

          console.log('[MultisigList] Loaded safes:', filteredSafes.length);
          console.log('[MultisigList] Network mode:', mode);
          console.log('[MultisigList] Available networks:', allowedNetworks);
        } catch (error) {
          console.error('[MultisigList] Failed to load safes:', error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const fetchSignerData = async () => {
        if (selectedNetwork && addresses?.[selectedNetwork]?.[0]) {
          const addr = addresses[selectedNetwork][0];
          setSignerAddress(addr);
          console.log('[MultisigList] Signer address:', addr);
          console.log('[MultisigList] Selected network:', selectedNetwork);

          try {
            const config = getMultisigNetworkConfig(selectedNetwork);
            const response = await fetch(config.provider, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [addr, 'latest'],
                id: 1,
              }),
            });
            const data = await response.json();
            if (data.result) {
              const balanceWei = BigInt(data.result);
              const balanceEth = Number(balanceWei) / 1e18;
              setSignerBalance(balanceEth.toFixed(4));
              console.log('[MultisigList] Signer balance:', balanceEth.toFixed(4), 'ETH');
            }
          } catch (error) {
            console.error('[MultisigList] Failed to fetch balance:', error);
            setSignerBalance('0.00');
          }
        }
      };
      fetchSignerData();
    }, [selectedNetwork, addresses])
  );

  const handleCopySignerAddress = async () => {
    if (signerAddress) {
      await Clipboard.setStringAsync(signerAddress);
      toast.success('Address copied to clipboard');
    }
  };

  const handleCreateSafe = () => {
    router.push('/multisig/create');
  };

  const handleImportSafe = () => {
    router.push('/multisig/import');
  };

  const handleSafePress = (safe: StoredSafe) => {
    router.push({
      pathname: '/multisig/[address]',
      params: { address: safe.address, network: safe.network },
    });
  };

  const formatAddress = (address: string, isPending: boolean) => {
    if (isPending) {
      return 'Not deployed yet';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkIcon = (network: MultisigNetworkType) => {
    return networkConfigs[network]?.icon;
  };

  const getNetworkName = (network: MultisigNetworkType) => {
    return networkConfigs[network]?.name || network;
  };

  const formatSignerAddress = (addr: string) => {
    if (!addr) return 'Loading...';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const getSelectedNetworkConfig = () => {
    if (!selectedNetwork) return null;
    return getMultisigNetworkConfig(selectedNetwork);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Multisig Safes" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.signerCard}>
          <View style={styles.signerHeader}>
            <Wallet size={20} color={colors.primary} />
            <Text style={styles.signerTitle}>Your Signer Wallet</Text>
          </View>

          <TouchableOpacity style={styles.signerAddressRow} onPress={handleCopySignerAddress}>
            <Text style={styles.signerAddress}>{formatSignerAddress(signerAddress)}</Text>
            <Copy size={14} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.signerBalanceRow}>
            <Text style={styles.signerBalanceLabel}>Balance:</Text>
            <Text style={styles.signerBalanceValue}>
              {signerBalance} {getSelectedNetworkConfig()?.nativeToken.symbol || 'ETH'}
            </Text>
          </View>

          {selectedNetwork && (
            <View style={styles.signerNetworkRow}>
              <Image source={networkConfigs[selectedNetwork]?.icon} style={styles.signerNetworkIcon} />
              <Text style={styles.signerNetworkName}>{networkConfigs[selectedNetwork]?.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCreateSafe}>
            <Plus size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Create Safe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleImportSafe}>
            <Shield size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Import Safe</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Safes</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : safes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Shield size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Safes Yet</Text>
              <Text style={styles.emptyText}>
                Create a new multisig Safe or import an existing one to get started.
              </Text>
            </View>
          ) : (
            <View style={styles.safesList}>
              {safes.map((safe) => {
                const isPending = safe.status === 'pending';
                return (
                  <TouchableOpacity
                    key={`${safe.network}-${safe.address}`}
                    style={[styles.safeCard, isPending && styles.safeCardPending]}
                    onPress={() => handleSafePress(safe)}
                  >
                    <View style={styles.safeIconContainer}>
                      <Image source={getNetworkIcon(safe.network)} style={styles.networkIcon} />
                    </View>

                    <View style={styles.safeInfo}>
                      <View style={styles.safeNameRow}>
                        <Text style={styles.safeName}>{safe.name}</Text>
                        {isPending && (
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>Pending</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.safeAddress, isPending && styles.safeAddressPending]}>
                        {formatAddress(safe.address, isPending)}
                      </Text>
                      <View style={styles.safeDetails}>
                        <Text style={styles.safeNetwork}>{getNetworkName(safe.network)}</Text>
                        <Text style={styles.safeThreshold}>
                          {safe.threshold}/{safe.owners.length}
                        </Text>
                      </View>
                    </View>

                    <ChevronRight size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  signerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  signerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  signerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  signerAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  signerAddress: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  signerBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  signerBalanceLabel: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  signerBalanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  signerNetworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signerNetworkIcon: {
    width: 16,
    height: 16,
  },
  signerNetworkName: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  safesList: {
    gap: 12,
  },
  safeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  safeCardPending: {
    borderWidth: 1,
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  safeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  networkIcon: {
    width: 24,
    height: 24,
  },
  safeInfo: {
    flex: 1,
  },
  safeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  safeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning,
  },
  safeAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  safeAddressPending: {
    fontFamily: undefined,
    fontStyle: 'italic',
  },
  safeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safeNetwork: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  safeThreshold: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
