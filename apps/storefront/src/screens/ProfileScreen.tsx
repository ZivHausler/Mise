import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { Phone, Mail } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useCustomerProfile, queryKeys } from '../api/hooks';
import { Card } from '../components/ui/Card';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { useStoreStore } from '../stores';

export function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const setStatusBarMode = useStoreStore((s) => s.setStatusBarMode);

  useFocusEffect(
    useCallback(() => {
      setStatusBarMode('default');
    }, []),
  );
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const isGuest = !user || user.provider === 'guest';

  const { data: profile } = useCustomerProfile();

  // Prefer backend data, fall back to auth store
  const firstName = profile?.firstName ?? user?.firstName;
  const lastName = profile?.lastName ?? user?.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const phone = profile?.phone ?? user?.phone;
  const email = profile?.email ?? user?.email;
  const photo = profile?.photo ?? user?.photo;

  const initial = fullName
    ? fullName.charAt(0).toUpperCase()
    : '\uD83D\uDC64'; // bust silhouette emoji

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.logout'),
          style: 'destructive',
          onPress: () => {
            queryClient.removeQueries({ queryKey: queryKeys.customerProfile });
            logoutStore();
          },
        },
      ],
    );
  }, [logoutStore, queryClient, t]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
              writingDirection: direction,
            },
          ]}
        >
          {t('profile.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card elevated style={styles.profileCard}>
            {/* Avatar */}
            {!isGuest && photo ? (
              <Image
                source={{ uri: photo }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={300}
                accessibilityLabel={fullName || t('profile.guest')}
              />
            ) : !isGuest ? (
              <View
                accessible
                accessibilityLabel={fullName || t('profile.title')}
                style={[
                  styles.avatar,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
              >
                <Text
                  style={[styles.avatarText, { fontFamily: theme.font('700') }]}
                >
                  {initial}
                </Text>
              </View>
            ) : (
              <View
                accessible
                accessibilityLabel={t('profile.guest')}
                style={[
                  styles.guestAvatar,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Text style={styles.guestAvatarEmoji}>{'\uD83D\uDC64'}</Text>
              </View>
            )}

            {/* Authenticated: show full name */}
            {!isGuest && fullName ? (
              <Text
                style={[
                  styles.profileName,
                  {
                    color: theme.colors.textStrong,
                    fontFamily: theme.font('700'),
                    writingDirection: direction,
                  },
                ]}
              >
                {fullName}
              </Text>
            ) : null}

            {/* Guest: show guest label, message, sign-in button */}
            {isGuest && (
              <>
                <Text
                  style={[
                    styles.guestLabel,
                    {
                      color: theme.colors.textStrong,
                      fontFamily: theme.font('600'),
                    },
                  ]}
                >
                  {t('profile.guest')}
                </Text>
                <Text
                  style={[
                    styles.guestMessage,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.font('400'),
                    },
                  ]}
                >
                  {t('profile.guestMessage')}
                </Text>
                <View style={styles.guestSignInButton}>
                  <GoogleSignInButton size="medium" />
                </View>
              </>
            )}
          </Card>
        </Animated.View>

        {/* Contact Details — only for authenticated users with at least one field */}
        {!isGuest && (phone || email) && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text
              style={[
                styles.sectionLabel,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.font('600'),
                  letterSpacing: isRTL ? 0 : 0.8,
                  writingDirection: direction,
                },
              ]}
            >
              {t('profile.contactDetails')}
            </Text>
            <Card style={styles.detailsCard}>
              {/* Phone row */}
              {phone ? (
                <View
                  style={styles.detailRow}
                  accessibilityLabel={`${t('profile.phone')}: ${phone}`}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${theme.colors.primary}12` },
                    ]}
                  >
                    <Phone
                      size={20}
                      color={theme.colors.primary}
                      strokeWidth={2}
                    />
                  </View>
                  <Text
                    style={[
                      styles.detailValue,
                      {
                        color: theme.colors.textPrimary,
                        fontFamily: theme.font('400'),
                      },
                    ]}
                  >
                    {phone}
                  </Text>
                </View>
              ) : null}

              {/* Separator — only if both phone and email exist */}
              {phone && email ? (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              ) : null}

              {/* Email row */}
              {email ? (
                <View
                  style={styles.detailRow}
                  accessibilityLabel={`${t('profile.email')}: ${email}`}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${theme.colors.primary}12` },
                    ]}
                  >
                    <Mail
                      size={20}
                      color={theme.colors.primary}
                      strokeWidth={2}
                    />
                  </View>
                  <Text
                    style={[
                      styles.detailValue,
                      {
                        color: theme.colors.textPrimary,
                        fontFamily: theme.font('400'),
                      },
                    ]}
                  >
                    {email}
                  </Text>
                </View>
              ) : null}
            </Card>
          </Animated.View>
        )}

        {/* Logout button — only for authenticated users */}
        {!isGuest && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                {
                  borderColor: theme.colors.error,
                  backgroundColor: pressed
                    ? `${theme.colors.error}15`
                    : 'transparent',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.logout')}
            >
              <Text
                style={[
                  styles.logoutText,
                  {
                    color: theme.colors.error,
                    fontFamily: theme.font('600'),
                    writingDirection: direction,
                  },
                ]}
              >
                {t('profile.logout')}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestAvatarEmoji: {
    fontSize: 32,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  guestLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  guestMessage: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
  guestSignInButton: {
    width: '100%',
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  detailsCard: {
    marginHorizontal: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '400',
    marginStart: 12,
    writingDirection: 'ltr',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
    marginStart: 48,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 32,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
