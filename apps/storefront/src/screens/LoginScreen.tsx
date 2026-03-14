import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useAuthStore } from '../stores/authStore';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGuestLogin = () => {
    loginAsGuest();
  };

  return (
    <View style={styles.container}>


      {/* Dark gradient background */}
      <View style={[styles.topSection, { backgroundColor: '#1A1A16' }]}>
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1, { backgroundColor: theme.colors.primary, opacity: 0.08 }]} />
        <View style={[styles.decorCircle, styles.decorCircle2, { backgroundColor: theme.colors.primary, opacity: 0.05 }]} />

        <SafeAreaView style={styles.topContent}>
          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.logoContainer}
          >
            <View style={[styles.logoCircle, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.logoEmoji}>{'\u{1F35E}'}</Text>
            </View>
          </Animated.View>

          {/* Brand */}
          <Animated.Text
            entering={FadeInDown.delay(400).springify()}
            style={[styles.brand, { fontFamily: theme.font('700') }]}
          >
            Mise
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(500).springify()}
            style={[styles.tagline, { fontFamily: theme.font('400'), writingDirection: direction }]}
          >
            {t('login.tagline')}
          </Animated.Text>
        </SafeAreaView>
      </View>

      {/* Bottom section with buttons */}
      <View style={[styles.bottomSection, { backgroundColor: theme.colors.surface }]}>
        {/* Welcome text */}
        <Animated.Text
          entering={FadeInUp.delay(600).springify()}
          style={[
            styles.welcomeTitle,
            { color: theme.colors.textStrong, fontFamily: theme.font('700'), writingDirection: direction },
          ]}
        >
          {t('login.welcome')}
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(700).springify()}
          style={[
            styles.welcomeSubtitle,
            { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction },
          ]}
        >
          {t('login.welcomeSubtitle')}
        </Animated.Text>

        {/* Google Sign-In Button */}
        <Animated.View entering={FadeInUp.delay(800).springify()}>
          <GoogleSignInButton
            size="large"
            onSuccess={() => {
              // Auth state update triggers navigator re-render automatically
            }}
            onError={() => {
              setIsGoogleLoading(false);
            }}
            onLoadingChange={setIsGoogleLoading}
          />
        </Animated.View>

        {/* Divider */}
        <Animated.View
          entering={FadeInUp.delay(900).springify()}
          style={styles.dividerRow}
        >
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          <Text
            style={[
              styles.dividerText,
              { color: theme.colors.textTertiary, fontFamily: theme.font('400') },
            ]}
          >
            {t('login.or')}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        </Animated.View>

        {/* Guest Button */}
        <Animated.View entering={FadeInUp.delay(1000).springify()}>
          <Pressable
            onPress={handleGuestLogin}
            disabled={isGoogleLoading}
            style={({ pressed }) => [
              styles.guestButton,
              {
                backgroundColor: pressed ? theme.colors.primaryPressed : theme.colors.primary,
                transform: [{ scale: pressed ? 0.98 : 1 }],
                shadowColor: theme.colors.primary,
                opacity: isGoogleLoading ? 0.5 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('login.continueAsGuest')}
          >
            <Text
              style={[
                styles.guestButtonText,
                { color: theme.colors.onPrimary, fontFamily: theme.font('700'), writingDirection: direction },
              ]}
            >
              {t('login.continueAsGuest')}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Terms */}
        <Animated.Text
          entering={FadeInUp.delay(1100).springify()}
          style={[
            styles.terms,
            { color: theme.colors.textTertiary, fontFamily: theme.font('400'), writingDirection: direction },
          ]}
        >
          {t('login.terms')}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  decorCircle1: {
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    top: -SCREEN_WIDTH * 0.5,
    end: -SCREEN_WIDTH * 0.3,
  },
  decorCircle2: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    bottom: -SCREEN_WIDTH * 0.3,
    start: -SCREEN_WIDTH * 0.2,
  },
  topContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C4823E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 42,
  },
  brand: {
    fontSize: 44,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
    writingDirection: 'ltr',
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  bottomSection: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  guestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  guestButtonText: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
