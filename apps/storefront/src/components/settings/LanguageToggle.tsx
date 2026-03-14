import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { configureRTL } from '../../i18n';

export const LanguageToggle = React.memo(function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const currentLang = i18n.language as 'he' | 'en';

  const [pillWidth, setPillWidth] = useState(0);

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const containerWidth = e.nativeEvent.layout.width;
    const w = (containerWidth - 8) / 2;
    setPillWidth(w);
  }, []);

  // Buttons are rendered in physical order: [English, Hebrew] left-to-right.
  // Container uses direction:'ltr' so nothing gets auto-flipped.
  // English = left = 0, Hebrew = right = pillWidth.
  const getOffsetForLang = useCallback(
    (lang: 'he' | 'en') => {
      if (pillWidth === 0) return 0;
      return lang === 'he' ? pillWidth : 0;
    },
    [pillWidth],
  );

  const pillLeft = useSharedValue(getOffsetForLang(currentLang));

  React.useEffect(() => {
    if (pillWidth > 0) {
      pillLeft.value = getOffsetForLang(currentLang);
    }
  }, [pillWidth]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 4 + pillLeft.value }],
    width: pillWidth > 0 ? pillWidth : '50%',
    opacity: pillWidth > 0 ? 1 : 0,
  }));

  const handleLanguageChange = useCallback(
    async (lang: 'he' | 'en') => {
      if (lang === currentLang) return;

      pillLeft.value = withTiming(getOffsetForLang(lang), { duration: 200 });

      await AsyncStorage.setItem('mise-storefront-language', lang);

      i18n.changeLanguage(lang);
      configureRTL(lang);
    },
    [currentLang, i18n, t, pillLeft, getOffsetForLang],
  );

  const OptionButton = useCallback(
    ({ lang, label }: { lang: 'he' | 'en'; label: string }) => (
      <Pressable
        onPress={() => handleLanguageChange(lang)}
        style={styles.option}
        accessibilityRole="button"
        accessibilityState={{ selected: currentLang === lang }}
        accessibilityLabel={label}
      >
        <Text
          style={[
            styles.optionText,
            {
              color:
                currentLang === lang
                  ? theme.colors.onPrimary
                  : theme.colors.textPrimary,
              fontFamily: theme.font(currentLang === lang ? '600' : '500'),
              writingDirection: direction,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    ),
    [currentLang, handleLanguageChange, theme],
  );

  return (
    <View
      onLayout={handleContainerLayout}
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      {/* Pill */}
      <Animated.View
        style={[
          styles.activePill,
          { backgroundColor: theme.colors.primary },
          animatedPillStyle,
        ]}
      />

      {/* Physical order: English on left, Hebrew on right */}
      <OptionButton lang="en" label={t('settings.english')} />
      <OptionButton lang="he" label={t('settings.hebrew')} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    direction: 'ltr',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 10,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  optionText: {
    fontSize: 15,
  },
});
