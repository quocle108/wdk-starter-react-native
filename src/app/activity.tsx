import { useWallet } from '@tetherto/wdk-react-native-core';
import { Transaction, TransactionList } from '@tetherto/wdk-uikit-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useTransactions } from '@/hooks/use-transactions';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import { assetConfig, AssetTicker } from '@/config/assets';
import formatTokenAmount from '@/utils/format-token-amount';
import formatUSDValue from '@/utils/format-usd-value';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { addresses, isInitialized } = useWallet();
  const [displayTransactions, setDisplayTransactions] = useState<Transaction[]>([]);

  // Extract addresses for account index 0 (flatten the structure)
  const flatAddresses = useMemo(() => {
    if (!addresses) return undefined;
    const result: Record<string, string> = {};
    for (const [network, accountAddresses] of Object.entries(addresses)) {
      if (accountAddresses && accountAddresses[0]) {
        result[network] = accountAddresses[0];
      }
    }
    return result;
  }, [addresses]);

  // Fetch transactions from indexer
  const { transactions, isLoading, error } = useTransactions(flatAddresses, {
    enabled: isInitialized && !!flatAddresses,
    limit: 50,
  });

  // Transform transactions to display format with fiat values
  useEffect(() => {
    const transformTransactions = async () => {
      if (!transactions || transactions.length === 0) {
        setDisplayTransactions([]);
        return;
      }

      const transformed = await Promise.all(
        transactions.map(async (tx) => {
          const tokenUpper = tx.token.toUpperCase() as AssetTicker;
          const config = assetConfig[tx.token as keyof typeof assetConfig];
          const amount = parseFloat(tx.amount);

          // Get fiat value
          let fiatAmount = 0;
          try {
            fiatAmount = await pricingService.getFiatValue(
              amount,
              tokenUpper,
              FiatCurrency.USD
            );
          } catch {
            // Ignore pricing errors
          }

          return {
            id: tx.id,
            type: tx.type,
            token: config?.name || tokenUpper,
            amount: formatTokenAmount(amount, tokenUpper),
            fiatAmount: formatUSDValue(fiatAmount, false),
            fiatCurrency: FiatCurrency.USD,
            network: tx.network,
          };
        })
      );

      setDisplayTransactions(transformed);
    };

    transformTransactions();
  }, [transactions]);

  // Show message for unsupported networks (only Spark regtest is not supported)
  const showTestnetNote = useMemo(() => {
    if (!flatAddresses) return false;
    // Check if any supported network address exists
    const hasSupportedAddress = flatAddresses.ethereum || flatAddresses.polygon ||
      flatAddresses.arbitrum || flatAddresses.plasma || flatAddresses.sepolia;
    // Only show note if we have spark but no supported networks
    return flatAddresses.spark && !hasSupportedAddress;
  }, [flatAddresses]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isLoading={isLoading} title="Activity" />

      {error && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>Unable to load transactions</Text>
        </View>
      )}

      {showTestnetNote && !isLoading && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            Transaction history is not available for Spark Regtest
          </Text>
        </View>
      )}

      {!error && displayTransactions.length === 0 && !isLoading && !showTestnetNote && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>No transactions yet</Text>
        </View>
      )}

      <TransactionList transactions={displayTransactions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageContainer: {
    padding: 16,
    alignItems: 'center',
  },
  messageText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
