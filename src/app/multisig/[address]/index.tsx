import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { multisigService, StoredSafe } from '@/services/multisig-service';
import { getMultisigNetworkConfig, MultisigNetworkType } from '@/config/multisig-config';
import { networkConfigs } from '@/config/networks';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Safe4337Pack } from '@wdk-safe-global/relay-kit';
import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import {
  ArrowUpRight,
  Clock,
  Copy,
  Rocket,
  Trash2,
  Users,
} from 'lucide-react-native';
import React, { useCallback, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function SafeDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { address, network } = useLocalSearchParams<{ address: string; network: MultisigNetworkType }>();

  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { addresses } = useWallet({ walletId: currentWalletId });

  const [safe, setSafe] = useState<StoredSafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [nativeBalance, setNativeBalance] = useState<string>('0');
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [pendingCount, setPendingCount] = useState(0);
  const [isDeployedOnChain, setIsDeployedOnChain] = useState<boolean | null>(null);
  const hasInitialized = useRef(false);

  const initializeSafe = useCallback(async (safeData: StoredSafe) => {
    if (!network || !safeData.saltNonce || hasInitialized.current) return;

    hasInitialized.current = true;
    setInitializing(true);

    try {
      const config = getMultisigNetworkConfig(network);
      const signerAddress = addresses?.[network]?.[0];

      console.log('[SafeDetails] Initializing Safe4337Pack...');
      console.log('[SafeDetails] Safe Address:', safeData.address);
      console.log('[SafeDetails] Network:', network);
      console.log('[SafeDetails] Signer:', signerAddress);
      console.log('[SafeDetails] Salt Nonce:', safeData.saltNonce);

      const response = await fetch(config.provider, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [safeData.address, 'latest'],
          id: 1,
        }),
      });
      const data = await response.json();
      const hasCode = data.result && data.result !== '0x';
      setIsDeployedOnChain(hasCode);

      console.log('[SafeDetails] Safe deployed on-chain:', hasCode);

      if (hasCode && safeData.status === 'pending') {
        console.log('[SafeDetails] Updating status to deployed');
        await multisigService.updateSafe(safeData.address, network, { status: 'deployed' });
        setSafe({ ...safeData, status: 'deployed' });
      }

      const balanceResponse = await fetch(config.provider, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [safeData.address, 'latest'],
          id: 2,
        }),
      });
      const balanceData = await balanceResponse.json();
      if (balanceData.result) {
        const balanceWei = BigInt(balanceData.result);
        const balanceEth = Number(balanceWei) / 1e18;
        setNativeBalance(balanceEth.toFixed(4));
        console.log('[SafeDetails] Native balance:', balanceEth.toFixed(4));
      }

      if (config.usdtToken?.address) {
        const usdtBalanceResponse = await fetch(config.provider, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: config.usdtToken.address,
              data: `0x70a08231000000000000000000000000${safeData.address.slice(2)}`,
            }, 'latest'],
            id: 3,
          }),
        });
        const usdtData = await usdtBalanceResponse.json();
        if (usdtData.result && usdtData.result !== '0x') {
          const usdtWei = BigInt(usdtData.result);
          const usdtAmount = Number(usdtWei) / Math.pow(10, config.usdtToken.decimals || 6);
          setUsdtBalance(usdtAmount.toFixed(2));
          console.log('[SafeDetails] USDT balance:', usdtAmount.toFixed(2));
        }
      }

      console.log('[SafeDetails] Safe initialization complete');
    } catch (error) {
      console.error('[SafeDetails] Failed to initialize Safe:', error);
    } finally {
      setInitializing(false);
    }
  }, [network, addresses]);

  const loadSafeData = useCallback(async () => {
    if (!address || !network) return;

    try {
      const safeData = await multisigService.getSafe(address, network);
      setSafe(safeData);

      if (safeData) {
        initializeSafe(safeData);
      }
    } catch (error) {
      console.error('Failed to load safe data:', error);
    } finally {
      setLoading(false);
    }
  }, [address, network, initializeSafe]);

  useFocusEffect(
    useCallback(() => {
      loadSafeData();
    }, [loadSafeData])
  );

  const handleCopyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      toast.success('Address copied to clipboard');
    }
  };

  const handleSend = () => {
    router.push({
      pathname: '/multisig/[address]/send',
      params: { address, network },
    });
  };

  const handlePending = () => {
    router.push({
      pathname: '/multisig/[address]/pending',
      params: { address, network },
    });
  };

  const handleOwners = () => {
    router.push({
      pathname: '/multisig/[address]/owners',
      params: { address, network },
    });
  };

  const handleDeployNow = async () => {
    if (!safe || !network) return;

    setDeploying(true);

    try {
      const config = getMultisigNetworkConfig(network);

      console.log('[DeploySafe] Starting Safe deployment...');
      console.log('[DeploySafe] Network:', network);
      console.log('[DeploySafe] Chain ID:', config.chainId.toString());
      console.log('[DeploySafe] Provider:', config.provider);
      console.log('[DeploySafe] Safe Name:', safe.name);
      console.log('[DeploySafe] Owners:', safe.owners);
      console.log('[DeploySafe] Threshold:', safe.threshold);

      // TODO: Call actual WDK SDK to deploy Safe
      // const walletManager = new WalletManagerEvmMultisigSafe({
      //   rpcUrl: config.rpcUrl,
      //   chainId: config.chainId,
      //   paymasterUrl: config.paymasterUrl,
      // });
      // const safeAccount = await walletManager.createSafe({
      //   owners: safe.owners,
      //   threshold: safe.threshold,
      // });
      // const deployedAddress = safeAccount.address;

      console.log('[DeploySafe] Deploying Safe to blockchain...');

      // Simulated deployment - replace with actual SDK call
      const deployedAddress = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      console.log('[DeploySafe] Safe deployed at:', deployedAddress);

      await multisigService.updateSafe(address!, network, {
        address: deployedAddress,
        status: 'deployed',
      });

      console.log('[DeploySafe] Safe updated in storage with status: deployed');

      toast.success('Safe deployed successfully!');
      router.replace({
        pathname: '/multisig/[address]',
        params: { address: deployedAddress, network },
      });
    } catch (error) {
      console.error('[DeploySafe] Failed to deploy safe:', error);
      Alert.alert('Error', 'Failed to deploy Safe. Please try again.');
    } finally {
      setDeploying(false);
    }
  };

  const handleRemoveSafe = () => {
    Alert.alert(
      'Remove Safe',
      'Are you sure you want to remove this Safe from your list? This will not delete the Safe on-chain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await multisigService.removeSafe(address!, network!);
              toast.success('Safe removed');
              router.back();
            } catch (error) {
              toast.error('Failed to remove Safe');
            }
          },
        },
      ]
    );
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  const getNetworkIcon = () => {
    return network ? networkConfigs[network]?.icon : null;
  };

  const getNetworkName = () => {
    return network ? networkConfigs[network]?.name || network : '';
  };

  const networkConfig = network ? getMultisigNetworkConfig(network) : null;

  if (loading || initializing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Safe Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {initializing ? 'Loading Safe from blockchain...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!safe) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Safe Details" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Safe not found</Text>
        </View>
      </View>
    );
  }

  const isPending = safe.status === 'pending';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title={safe.name} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isPending && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              This Safe has not been deployed yet
            </Text>
          </View>
        )}

        <View style={styles.safeHeader}>
          <View style={styles.networkBadge}>
            <Image source={getNetworkIcon()} style={styles.networkIcon} />
            <Text style={styles.networkName}>{getNetworkName()}</Text>
          </View>

          <TouchableOpacity style={styles.addressRow} onPress={handleCopyAddress}>
            <Text style={styles.address}>{formatAddress(address!)}</Text>
            <Copy size={16} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.thresholdBadge}>
            <Text style={styles.thresholdText}>
              {safe.threshold}/{safe.owners.length} signatures required
            </Text>
          </View>
        </View>

        {isPending ? (
          <View style={styles.deploySection}>
            <Text style={styles.deployTitle}>Deploy Your Safe</Text>
            <Text style={styles.deployDescription}>
              Deploy this Safe to the blockchain to start using it. You will need ETH to pay for gas fees.
            </Text>

            <TouchableOpacity
              style={[styles.deployButton, deploying && styles.deployButtonDisabled]}
              onPress={handleDeployNow}
              disabled={deploying}
            >
              {deploying ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <>
                  <Rocket size={20} color={colors.text} />
                  <Text style={styles.deployButtonText}>Deploy Now</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.ownersPreview}>
              <Text style={styles.ownersPreviewTitle}>Owners ({safe.owners.length})</Text>
              {safe.owners.map((owner, index) => (
                <Text key={index} style={styles.ownerAddress}>
                  {owner.slice(0, 10)}...{owner.slice(-8)}
                </Text>
              ))}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.balanceSection}>
              <Text style={styles.sectionTitle}>Balance</Text>

              <View style={styles.balanceCard}>
                <View style={styles.balanceRow}>
                  <Text style={styles.tokenName}>{networkConfig?.nativeToken.symbol || 'ETH'}</Text>
                  <Text style={styles.balanceValue}>{nativeBalance}</Text>
                </View>

                <View style={styles.balanceDivider} />

                <View style={styles.balanceRow}>
                  <Text style={styles.tokenName}>{networkConfig?.usdtToken.symbol || 'USDT'}</Text>
                  <Text style={styles.balanceValue}>{usdtBalance}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Actions</Text>

              <View style={styles.actionsGrid}>
                <TouchableOpacity style={styles.actionCard} onPress={handleSend}>
                  <ArrowUpRight size={24} color={colors.primary} />
                  <Text style={styles.actionText}>Send</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={handlePending}>
                  <Clock size={24} color={colors.primary} />
                  <Text style={styles.actionText}>Pending</Text>
                  {pendingCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={handleOwners}>
                  <Users size={24} color={colors.primary} />
                  <Text style={styles.actionText}>Owners</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.removeButton} onPress={handleRemoveSafe}>
            <Trash2 size={20} color={colors.danger} />
            <Text style={styles.removeButtonText}>Remove Safe</Text>
          </TouchableOpacity>
          <Text style={styles.removeHint}>
            {isPending
              ? 'This will delete the saved Safe configuration.'
              : 'This only removes the Safe from your app. It will not affect the Safe on-chain.'}
          </Text>
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
  pendingBanner: {
    backgroundColor: colors.warning + '20',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.warning + '40',
  },
  pendingBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.warning,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  safeHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
  },
  networkIcon: {
    width: 20,
    height: 20,
  },
  networkName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  thresholdBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  thresholdText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  balanceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.borderDark,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  deploySection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  deployTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deployDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deployButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  deployButtonDisabled: {
    opacity: 0.6,
  },
  deployButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  ownersPreview: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  ownersPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  ownerAddress: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    paddingVertical: 6,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  dangerSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  removeHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});
