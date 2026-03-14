import React from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChangeText, onClear }: SearchBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
        },
      ]}
    >
      <View
        style={[
          styles.inputContainer,
          {
            height: theme.sizing.searchBarHeight,
            backgroundColor: theme.colors.surfaceSecondary,
          },
        ]}
      >
        <Text style={[styles.searchIcon, { color: theme.colors.textTertiary }]}>
          {'\u{1F50D}'}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('menu.searchPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.font('400'),
              writingDirection: direction,
              textAlign: direction === 'rtl' ? 'right' : 'left',
            },
          ]}
          selectionColor={theme.colors.primary}
          returnKeyType="search"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable
            onPress={onClear}
            hitSlop={8}
            accessibilityLabel={t('common.close')}
            accessibilityRole="button"
            style={[styles.clearButtonContainer, { backgroundColor: theme.colors.textTertiary }]}
          >
            <Text style={styles.clearButton}>
              {'\u2715'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingVertical: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 24,
  },
  searchIcon: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  clearButtonContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
