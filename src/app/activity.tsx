import { Transaction, TransactionList } from '@tetherto/wdk-uikit-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '@/components/header';
import { colors } from '@/constants/colors';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const transactions: Transaction[] = [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isLoading={false} title="Activity" />
      <TransactionList transactions={transactions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
