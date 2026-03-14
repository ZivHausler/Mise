import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { EmptyState } from '../components/ui/EmptyState';
import type { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Error'>;

const ERROR_ICONS: Record<string, string> = {
  storeNotFound: '\u{1F50D}',     // magnifying glass
  storefrontDisabled: '\u{1F512}', // lock
  networkError: '\u{1F4E1}',      // satellite antenna (wifi/network)
  generic: '\u{26A0}\uFE0F',      // warning sign
};

export function ErrorScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const { type } = route.params;

  const config = {
    storeNotFound: {
      title: t('error.storeNotFound'),
      message: t('error.storeNotFoundMessage'),
    },
    storefrontDisabled: {
      title: t('error.storefrontDisabled'),
      message: t('error.storefrontDisabledMessage'),
    },
    networkError: {
      title: t('error.networkError'),
      message: t('error.networkErrorMessage'),
      actionLabel: t('error.tryAgain'),
      onAction: () => navigation.goBack(),
    },
    generic: {
      title: t('error.genericError'),
      message: t('error.genericErrorMessage'),
      actionLabel: t('error.tryAgain'),
      onAction: () => navigation.goBack(),
    },
  }[type];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <EmptyState
        title={config.title}
        message={config.message}
        actionLabel={'actionLabel' in config ? config.actionLabel : undefined}
        onAction={'onAction' in config ? config.onAction : undefined}
        icon={ERROR_ICONS[type] || ERROR_ICONS.generic}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
