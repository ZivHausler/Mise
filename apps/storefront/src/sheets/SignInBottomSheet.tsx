import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';

interface SignInBottomSheetProps {
  onSuccess: () => void;
}

export const SignInBottomSheet = forwardRef<BottomSheet, SignInBottomSheetProps>(
  function SignInBottomSheet({ onSuccess }, ref) {
    const { t } = useTranslation();
    const theme = useTheme();
    const { direction } = useDirection();
    const insets = useSafeAreaInsets();
    const [error, setError] = useState<string | null>(null);

    const snapPoints = useMemo(() => ['40%'], []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.65}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handleSuccess = useCallback(() => {
      setError(null);
      onSuccess();
    }, [onSuccess]);

    const handleError = useCallback((msg: string) => {
      setError(msg);
    }, []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableOverDrag={false}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.primary,
          width: 40,
          height: 5,
          borderRadius: 3,
        }}
        backgroundStyle={{
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: theme.colors.surface,
        }}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
          {/* Lock Icon */}
          <Animated.View
            entering={FadeInUp.delay(100).duration(300)}
            style={styles.iconContainer}
          >
            <Lock size={32} color={theme.colors.primary} strokeWidth={2} />
          </Animated.View>

          {/* Title */}
          <Animated.Text
            entering={FadeInUp.delay(200).duration(300)}
            style={[
              styles.title,
              {
                color: theme.colors.textStrong,
                fontFamily: theme.font('700'),
                writingDirection: direction,
              },
            ]}
          >
            {t('auth.signInToOrder')}
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text
            entering={FadeInUp.delay(300).duration(300)}
            style={[
              styles.subtitle,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.font('400'),
                writingDirection: direction,
              },
            ]}
          >
            {t('auth.signInToOrderSubtitle')}
          </Animated.Text>

          {/* Google Sign-In Button */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(300)}
            style={styles.buttonContainer}
          >
            <GoogleSignInButton
              onSuccess={handleSuccess}
              onError={handleError}
              size="large"
            />
          </Animated.View>

          {/* Error */}
          {error && (
            <Text
              style={[
                styles.errorText,
                {
                  color: theme.colors.error,
                  fontFamily: theme.font('400'),
                  writingDirection: direction,
                },
              ]}
            >
              {error}
            </Text>
          )}

          {/* Terms */}
          <Animated.Text
            entering={FadeInUp.delay(500).duration(300)}
            style={[
              styles.terms,
              {
                color: theme.colors.textTertiary,
                fontFamily: theme.font('400'),
                writingDirection: direction,
              },
            ]}
          >
            {t('auth.terms')}
          </Animated.Text>
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
  },
  errorText: {
    fontSize: 13,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  terms: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
