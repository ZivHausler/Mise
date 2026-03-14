import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { Card } from '../components/ui/Card';
import { LanguageToggle } from '../components/settings/LanguageToggle';
import { useStoreStore } from '../stores';

export function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const setStatusBarMode = useStoreStore((s) => s.setStatusBarMode);

  useFocusEffect(
    useCallback(() => {
      setStatusBarMode('default');
    }, []),
  );

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

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
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language section */}
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
          {t('settings.language')}
        </Text>
        <Card style={styles.languageCard}>
          <LanguageToggle />
        </Card>

        {/* About section */}
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
          {t('settings.about')}
        </Text>
        <Card style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <Text
              style={[
                styles.aboutLabel,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.font('500'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('settings.appVersion')}
            </Text>
            <Text
              style={[
                styles.aboutValue,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.font('400'),
                  writingDirection: 'ltr',
                },
              ]}
            >
              {appVersion}
            </Text>
          </View>
        </Card>
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  languageCard: {
    marginHorizontal: 20,
  },
  aboutCard: {
    marginHorizontal: 20,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 15,
    fontWeight: '400',
  },
});
