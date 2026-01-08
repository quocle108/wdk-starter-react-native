import { assetConfig, AssetTicker } from '@/config/assets';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useWallet, useWalletManager, useBalancesForWallet } from '@tetherto/wdk-react-native-core';
import getTokenConfigs from '@/config/get-token-configs';
import { AssetSelector, type Token } from '@tetherto/wdk-uikit-react-native';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import formatAmount from '@/utils/format-amount';
import getDisplaySymbol from '@/utils/get-display-symbol';
import { getRecentTokens, addToRecentTokens } from '@/utils/recent-tokens';
import formatTokenAmount from '@/utils/format-token-amount';
import Header from '@/components/header';

export default function SelectTokenScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const params = useLocalSearchParams();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier;
  const { isInitialized } = useWallet({ walletId: currentWalletId });
  const tokenConfigs = useMemo(() => getTokenConfigs(), []);
  const { data: balanceResults } = useBalancesForWallet(0, tokenConfigs, { enabled: isInitialized });

  const { scannedAddress } = params as { scannedAddress?: string };
  const [recentTokens, setRecentTokens] = useState<string[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    const loadRecentTokens = async () => {
      const recent = await getRecentTokens('send');
      setRecentTokens(recent);
    };
    loadRecentTokens();
  }, []);

  useEffect(() => {
    const calculateTokensWithFiatValues = async () => {
      if (!balanceResults) {
        setTokens([]);
        return;
      }

      const balanceMap = new Map<string, { totalBalance: number }>();

      balanceResults.forEach((result) => {
        if (!result.success || !result.balance) return;

        const networkTokens = tokenConfigs[result.network];
        if (!networkTokens) return;

        let denomination = '';
        let decimals = 18;

        if (result.tokenAddress === null) {
          denomination = networkTokens.native.symbol.toLowerCase();
          decimals = networkTokens.native.decimals;
        } else {
          const token = networkTokens.tokens.find((t) => t.address === result.tokenAddress);
          if (token) {
            denomination = token.symbol.toLowerCase();
            decimals = token.decimals;
          }
        }

        if (!denomination) return;

        const balanceNum = parseFloat(result.balance) / Math.pow(10, decimals);
        const current = balanceMap.get(denomination) || { totalBalance: 0 };
        balanceMap.set(denomination, { totalBalance: current.totalBalance + balanceNum });
      });

      const tokensWithBalances: Token[] = [];

      for (const [assetSymbol, { totalBalance }] of balanceMap.entries()) {
        const config = assetConfig[assetSymbol as keyof typeof assetConfig];
        if (!config) continue;

        let usdValue = 0;
        try {
          usdValue = await pricingService.getFiatValue(totalBalance, assetSymbol as AssetTicker, FiatCurrency.USD);
        } catch {
          usdValue = 0;
        }

        tokensWithBalances.push({
          id: assetSymbol,
          symbol: getDisplaySymbol(assetSymbol),
          name: config.name,
          balance: formatTokenAmount(totalBalance, assetSymbol as AssetTicker, false),
          balanceUSD: `${formatAmount(usdValue)} USD`,
          icon: config.icon,
          color: config.color,
          hasBalance: totalBalance > 0,
        });
      }

      const sortedTokens = tokensWithBalances.sort((a, b) => {
        const aValue = parseFloat(a.balanceUSD.replace(/[$,]/g, ''));
        const bValue = parseFloat(b.balanceUSD.replace(/[$,]/g, ''));
        if (aValue === 0 && bValue === 0) return a.name.localeCompare(b.name);
        if (aValue === 0) return 1;
        if (bValue === 0) return -1;
        return bValue - aValue;
      });

      setTokens(sortedTokens);
    };

    calculateTokensWithFiatValues();
  }, [balanceResults, tokenConfigs]);

  const handleSelectToken = useCallback(
    async (token: Token) => {
      if (!token.hasBalance) return;

      const updatedRecent = await addToRecentTokens(token.name, 'send');
      setRecentTokens(updatedRecent);

      router.push({
        pathname: '/send/select-network',
        params: {
          tokenId: token.id,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          tokenBalance: token.balance,
          tokenBalanceUSD: token.balanceUSD,
          ...(scannedAddress && { scannedAddress }),
        },
      });
    },
    [router, scannedAddress]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Send funds" style={styles.header} />
      <AssetSelector tokens={tokens} recentTokens={recentTokens} onSelectToken={handleSelectToken} />
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
});
