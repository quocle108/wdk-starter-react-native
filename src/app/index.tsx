import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { pricingService } from '../services/pricing-service';
import { colors } from '@/constants/colors';

export default function Index() {
  const { isInitialized } = useWallet();
  const { hasWallet } = useWalletManager();
  const [isPricingReady, setIsPricingReady] = useState(false);

  const initializePricing = async () => {
    try {
      await pricingService.initialize();
      setIsPricingReady(true);
    } catch (error) {
      console.error('Failed to initialize pricing service:', error);
      setIsPricingReady(true);
    }
  };

  useEffect(() => {
    initializePricing();
  }, []);

  if (!isPricingReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasWallet) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={isInitialized ? '/wallet' : '/authorize'} />;
}
