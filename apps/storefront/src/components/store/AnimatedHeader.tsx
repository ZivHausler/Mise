import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import type { PublicStoreInfo } from '../../api/types';
import { resolvePhotoUrl } from '../../api/client';
import { BannerCurve } from './BannerCurve';

const BANNER_HEIGHT = 200;
const LOGO_SIZE = 80;
const LOGO_OVERLAP = LOGO_SIZE * 0.65;

export const HEADER_EXPANDED = BANNER_HEIGHT + LOGO_OVERLAP + 100;
export const HEADER_COLLAPSED = 56;

interface AnimatedHeaderProps {
  store: PublicStoreInfo;
  scrollY: SharedValue<number>;
}

export function AnimatedHeader({ store, scrollY }: AnimatedHeaderProps) {
  const theme = useTheme();
  const { isRTL, direction } = useDirection();

  const heroContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 130],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [0, 130],
      [1, 0.92],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  });

  const compactStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [150, 220],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [150, 220],
      [-8, 0],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  const hasDetails = !!(store.address || store.phone);

  return (
    <View style={styles.outerClip}>
      <View style={styles.overscrollBg} />
      <Animated.View style={[styles.expandedWrapper, heroContentStyle]}>
        {/* Banner */}
        <View style={styles.banner}>
          {store.bannerUrl ? (
            <>
              <Image
                source={{ uri: resolvePhotoUrl(store.bannerUrl) }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
              />
              <View style={styles.bannerOverlay} />
            </>
          ) : (
            <View style={styles.darkBg} />
          )}
          <BannerCurve />
        </View>

        {/* Content below banner */}
        <View style={[styles.content, { paddingTop: LOGO_OVERLAP - 4 }]}>
          {/* Floating logo */}
          {store.logoUrl && (
            <View style={[styles.logoContainer, { top: -LOGO_OVERLAP }]}>
              <Image
                source={{ uri: resolvePhotoUrl(store.logoUrl) }}
                style={styles.logo}
                contentFit="cover"
              />
            </View>
          )}

          <Text
            style={[
              styles.storeName,
              { color: theme.colors.textStrong, fontFamily: theme.font('700'), writingDirection: direction },
            ]}
            numberOfLines={1}
          >
            {store.name}
          </Text>

          {store.description && (
            <Text
              style={[styles.descriptionText, { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction }]}
            >
              {store.description}
            </Text>
          )}

          {hasDetails && (
            <View style={[styles.iconsRow, { flexDirection: 'row' }]}>
              {store.address ? (
                <Pressable
                  onPress={() => Linking.openURL(`maps:?q=${encodeURIComponent(store.address!)}`)}
                  style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.colors.primary + '18', opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={styles.iconEmoji}>📍</Text>
                </Pressable>
              ) : null}
              {store.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${store.phone}`)}
                  style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.colors.primary + '18', opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={styles.iconEmoji}>📞</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </Animated.View>

      {/* Collapsed compact header */}
      <Animated.View
        style={[
          styles.compactHeader,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
          compactStyle,
        ]}
      >
        <View style={[styles.compactInner, { flexDirection: 'row' }]}>
          <View
            style={[
              styles.compactDot,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <Text
            style={[
              styles.compactName,
              {
                color: theme.colors.textStrong,
                fontFamily: theme.font('600'),
                writingDirection: direction,
              },
            ]}
            numberOfLines={1}
          >
            {store.name}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerClip: {
    overflow: 'visible',
  },
  overscrollBg: {
    position: 'absolute',
    top: -800,
    left: 0,
    right: 0,
    height: 800,
    backgroundColor: '#1A1A16',
    zIndex: -1,
  },
  expandedWrapper: {},
  banner: {
    width: '100%',
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  darkBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1A16',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  logoContainer: {
    position: 'absolute',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 20,
  },
  storeName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  iconsRow: {
    gap: 12,
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 18,
  },
  compactHeader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  compactInner: {
    alignItems: 'center',
    gap: 8,
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactName: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
