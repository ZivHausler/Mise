import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
} from '@expo-google-fonts/heebo';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider } from './theme';
import { useStoreStore } from './stores';
import { useOrderJournalStore } from './stores/orderJournalStore';
import { RootNavigator } from './navigation';
import { DirectionProvider, useDirection } from './contexts/DirectionContext';
import i18n, { configureRTL } from './i18n'; // Initialize i18n + RTL on import

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const TRANSITION_MS = 300;

function AppContent() {
  const themeName = 'white' as const;
  const { direction } = useDirection();
  const insets = useSafeAreaInsets();
  const statusBarMode = useStoreStore((s) => s.statusBarMode);

  const whiteOpacity = useSharedValue(1);
  const darkOpacity = useSharedValue(0);

  useEffect(() => {
    // default = white bg | dark = dark bg | transparent = no bg
    whiteOpacity.value = withTiming(statusBarMode === 'default' ? 1 : 0, { duration: TRANSITION_MS });
    darkOpacity.value = withTiming(statusBarMode === 'dark' ? 1 : 0, { duration: TRANSITION_MS });
  }, [statusBarMode]);

  const whiteStyle = useAnimatedStyle(() => ({ opacity: whiteOpacity.value }));
  const darkStyle = useAnimatedStyle(() => ({ opacity: darkOpacity.value }));

  // Cleanup stale orders (> 30 days) on mount
  useEffect(() => {
    useOrderJournalStore.getState().cleanupStale();
  }, []);

  const statusBarTextStyle = statusBarMode === 'default' ? 'dark' : 'light';

  return (
    <ThemeProvider themeName={themeName}>
      <View style={[styles.container, { direction }]}>
        <StatusBar style={statusBarTextStyle} />
        <Animated.View
          style={[styles.statusBarBg, { height: insets.top, backgroundColor: '#1A1A16' }, darkStyle]}
          pointerEvents="none"
        />
        <Animated.View
          style={[styles.statusBarBg, { height: insets.top, backgroundColor: '#FFFFFF' }, whiteStyle]}
          pointerEvents="none"
        />
        <RootNavigator />
      </View>
    </ThemeProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('mise-storefront-language').then((saved) => {
      const lang = (saved === 'he' || saved === 'en') ? saved : 'he';
      if (lang !== i18n.language) {
        i18n.changeLanguage(lang);
      }
      configureRTL(lang);
      setLangReady(true);
    });
  }, []);

  if (!fontsLoaded || !langReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C4823E" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DirectionProvider>
            <AppContent />
          </DirectionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  statusBarBg: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
