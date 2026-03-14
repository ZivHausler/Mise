import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import Constants from 'expo-constants';
import { useAuthStore } from '../../stores/authStore';
import { storefrontGoogleAuth, storefrontGoogleAuthWithAccessToken } from '../../api/hooks';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = Constants.expoConfig?.extra?.googleWebClientId ?? '';
const GOOGLE_IOS_CLIENT_ID = Constants.expoConfig?.extra?.googleIosClientId ?? '';
const GOOGLE_ANDROID_CLIENT_ID = Constants.expoConfig?.extra?.googleAndroidClientId ?? '';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onLoadingChange?: (loading: boolean) => void;
  size?: 'large' | 'medium';
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  onLoadingChange,
  size = 'large',
}: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [isLoading, setIsLoading] = useState(false);
  const [handledResponseState, setHandledResponseState] = useState<string | null>(null);

  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    scopes: ['openid', 'profile', 'email'],
  });

  const handleAuthResult = useCallback(
    (result: {
      token: string;
      customer: { id: number; email: string; firstName: string | null; lastName: string | null; phone: string | null; photo: string | null };
      isProfileComplete: boolean;
    }) => {
      loginWithGoogle(
        {
          id: String(result.customer.id),
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
          phone: result.customer.phone,
          email: result.customer.email,
          photo: result.customer.photo ?? undefined,
          provider: 'google',
          isProfileComplete: result.isProfileComplete,
        },
        result.token,
      );
      onSuccess?.();
    },
    [loginWithGoogle, onSuccess],
  );

  const authenticateWithBackend = useCallback(
    async (idToken: string) => {
      setIsLoading(true);
      try {
        const result = await storefrontGoogleAuth(idToken);
        handleAuthResult(result);
      } catch (err: any) {
        const message = err?.message ?? t('auth.signInErrorRetry');
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [handleAuthResult, onError, t],
  );

  const authenticateWithAccessToken = useCallback(
    async (accessToken: string) => {
      setIsLoading(true);
      try {
        const result = await storefrontGoogleAuthWithAccessToken(accessToken);
        handleAuthResult(result);
      } catch (err: any) {
        const message = err?.message ?? t('auth.signInErrorRetry');
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    },
    [handleAuthResult, onError, t],
  );

  useEffect(() => {
    if (!response || response.type !== 'success') {
      if (response?.type === 'error') {
        onError?.(response.error?.message ?? t('auth.signInErrorRetry'));
      }
      return;
    }

    // Prevent duplicate calls for the same response
    const state = response.params?.state;
    if (state && state === handledResponseState) return;
    if (state) setHandledResponseState(state);

    const idToken = response.authentication?.idToken;
    const accessToken = response.authentication?.accessToken;
    if (idToken) {
      authenticateWithBackend(idToken);
    } else if (accessToken) {
      authenticateWithAccessToken(accessToken);
    } else {
      onError?.(t('auth.signInErrorRetry'));
    }
  }, [response, authenticateWithBackend, authenticateWithAccessToken, onError, t, handledResponseState]);

  const isLarge = size === 'large';
  const buttonHeight = isLarge ? 52 : 44;

  return (
    <Pressable
      onPress={() => promptAsync()}
      disabled={!request || isLoading}
      style={({ pressed }) => [
        styles.button,
        {
          height: buttonHeight,
          borderColor: theme.colors.border,
          backgroundColor: pressed
            ? theme.colors.surfaceSecondary
            : theme.colors.card,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          opacity: !request || isLoading ? 0.6 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('auth.continueWithGoogle')}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <View style={styles.iconContainer}>
          <Text style={styles.googleG}>G</Text>
        </View>
      )}
      <Text
        style={[
          styles.buttonText,
          {
            color: theme.colors.textStrong,
            fontFamily: theme.font('600'),
            fontSize: isLarge ? 16 : 15,
            writingDirection: direction,
          },
        ]}
      >
        {isLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonText: {
    fontWeight: '600',
  },
});
