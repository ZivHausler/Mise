/**
 * OrderAgainCard — A single card in the "Order Again" horizontal carousel.
 * Zones: A (header with store info), B (optional photo strip), C (reorder button).
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { useHaptics } from '../../hooks/useHaptics';
import { getRelativeDate } from '../../utils/dateHelpers';
import type { CustomerOrderSummary } from '../../api/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH > 600 ? SCREEN_WIDTH * 0.45 : SCREEN_WIDTH * 0.78;
export const CARD_GAP = 12;

interface OrderAgainCardProps {
  order: CustomerOrderSummary;
  index: number;
  onReorder: (order: CustomerOrderSummary) => void;
}

// ─── Component ──────────────────────────────────────────

function OrderAgainCardInner({ order, index, onReorder }: OrderAgainCardProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const haptics = useHaptics();

  // Press animation
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
  }, [scale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1.0, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handleReorder = useCallback(() => {
    haptics.impactLight();
    onReorder(order);
  }, [haptics, onReorder, order]);

  // Data
  const initial = order.storeName.charAt(0).toUpperCase();
  const items = order.items ?? [];
  const itemPreview = items
    .slice(0, 2)
    .map((i) => i.name)
    .join(' \u00B7 ');
  const moreCount = items.length - 2;

  const photos = items
    .filter((i) => i.photo)
    .map((i) => i.photo as string);

  const relativeDate = getRelativeDate(order.createdAt, i18n.language, t);

  return (
    <Animated.View
      entering={
        FadeInDown
          .delay(Math.min(380 + index * 60, 700))
          .springify()
          .damping(18)
          .stiffness(200)
      }
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={handleReorder}
        accessibilityRole="button"
        accessibilityLabel={`${t('reorder.button')} ${order.storeName}`}
      >
        <Animated.View
          style={[
            styles.card,
            {
              width: CARD_WIDTH,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              shadowColor: '#000000',
            },
            animatedStyle,
          ]}
        >
          {/* Zone A: Header */}
          <View style={styles.zoneA}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.avatarText, { fontFamily: theme.font('700') }]}>
                {initial}
              </Text>
            </View>

            <View style={styles.headerInfo}>
              <View style={styles.headerTopRow}>
                <Text
                  style={[
                    styles.storeName,
                    {
                      color: theme.colors.textStrong,
                      fontFamily: theme.font('600'),
                      writingDirection: direction,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {order.storeName}
                </Text>
                <Text
                  style={[
                    styles.relativeDate,
                    {
                      color: theme.colors.textTertiary,
                      fontFamily: theme.font('400'),
                      writingDirection: direction,
                    },
                  ]}
                >
                  {relativeDate}
                </Text>
              </View>

              <Text
                style={[
                  styles.itemPreview,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.font('400'),
                    writingDirection: direction,
                  },
                ]}
                numberOfLines={1}
              >
                {itemPreview}
                {moreCount > 0 ? ` ${t('home.itemsMore', { count: moreCount })}` : ''}
              </Text>
            </View>
          </View>

          {/* Zone B: Photo strip (optional) */}
          {photos.length > 0 && (
            <View style={styles.zoneB}>
              {photos.slice(0, photos.length > 2 ? 2 : 3).map((photo, idx) => (
                <Image
                  key={idx}
                  source={{ uri: photo }}
                  style={[styles.thumbnail, { borderRadius: 10 }]}
                  contentFit="cover"
                />
              ))}
              {photos.length > 2 && (
                <View style={[styles.thumbnail, styles.moreOverlay, { borderRadius: 10 }]}>
                  {photos[2] && (
                    <Image
                      source={{ uri: photos[2] }}
                      style={[StyleSheet.absoluteFillObject, { borderRadius: 10, opacity: 0.4 }]}
                      contentFit="cover"
                    />
                  )}
                  <Text style={[styles.moreText, { fontFamily: theme.font('700') }]}>
                    +{photos.length - 2}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Zone C: Reorder footer button */}
          <Pressable
            onPress={handleReorder}
            style={[
              styles.zoneC,
              { backgroundColor: `${theme.colors.primary}1A`, borderRadius: 10 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('reorder.button')}
          >
            <RotateCcw size={16} color={theme.colors.primary} />
            <Text
              style={[
                styles.reorderText,
                {
                  color: theme.colors.primary,
                  fontFamily: theme.font('600'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('reorder.button')}
            </Text>
            <Text
              style={[
                styles.reorderDot,
                { color: theme.colors.primary, fontFamily: theme.font('400') },
              ]}
            >
              {'\u00B7'}
            </Text>
            <Text
              style={[
                styles.reorderPrice,
                {
                  color: theme.colors.primary,
                  fontFamily: theme.font('700'),
                  writingDirection: 'ltr',
                },
              ]}
            >
              {order.totalAmount.toFixed(0)} {'\u20AA'}
            </Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export const OrderAgainCard = React.memo(
  OrderAgainCardInner,
  (prev, next) =>
    prev.order.orderNumber === next.order.orderNumber &&
    prev.order.status === next.order.status &&
    prev.index === next.index,
);

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  // Zone A
  zoneA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  relativeDate: {
    fontSize: 12,
    fontWeight: '400',
    marginStart: 8,
  },
  itemPreview: {
    fontSize: 13,
    fontWeight: '400',
  },
  // Zone B
  zoneB: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  thumbnail: {
    width: 56,
    height: 56,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  moreOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  moreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Zone C
  zoneC: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 6,
  },
  reorderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reorderDot: {
    fontSize: 14,
  },
  reorderPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
});
