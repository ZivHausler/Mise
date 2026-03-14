import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { getStatusConfig } from '../../constants/orderStatusColors';
import { OrderCardAccentStrip } from './OrderCardAccentStrip';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderMiniProgress } from './OrderMiniProgress';
import { Button } from '../ui/Button';
import { useDirection } from '../../contexts/DirectionContext';
import { formatDate, getRelativeDate } from '../../utils/dateHelpers';
import type { CustomerOrderSummary } from '../../api/types';

// ─── Variant helpers ────────────────────────────────────────────

export type CardVariant = 'active' | 'past' | 'cancelled';

export function getCardVariant(status: number | undefined): CardVariant {
  if (status === 5) return 'cancelled';
  if (status === 4) return 'past';
  return 'active';
}

const VARIANT_BG: Record<CardVariant, string> = {
  active: '#FFFFFF',
  past: '#FAFAFA',
  cancelled: '#F5F0EB',
};

const VARIANT_AVATAR_OPACITY: Record<CardVariant, number> = {
  active: 1.0,
  past: 0.7,
  cancelled: 0.5,
};

// ─── Props ──────────────────────────────────────────────────────

interface OrderCardProps {
  order: CustomerOrderSummary;
  index: number;
  onPress: (order: CustomerOrderSummary) => void;
  variant: CardVariant;
  onReorder?: (order: CustomerOrderSummary) => void;
  isReordering?: boolean;
}

// ─── Component ──────────────────────────────────────────────────

export const OrderCard = React.memo(
  function OrderCard({ order, index, onPress, variant, onReorder, isReordering }: OrderCardProps) {
    const { t, i18n } = useTranslation();
    const theme = useTheme();
    const { isRTL, direction } = useDirection();
    const config = getStatusConfig(order.status);
    const initial = order.storeName.charAt(0).toUpperCase();
    const isPast = variant !== 'active';

    // ─── Press animation ──────────────────────────────────────
    const scale = useSharedValue(1);
    const shadowOp = useSharedValue(variant === 'active' ? 0.1 : 0.05);

    const animatedCardStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      shadowOpacity: shadowOp.value,
    }));

    const onPressIn = useCallback(() => {
      scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
      shadowOp.value = withTiming(0.04, { duration: 80 });
    }, [scale, shadowOp]);

    const onPressOut = useCallback(() => {
      scale.value = withSpring(1.0, { damping: 15, stiffness: 300 });
      shadowOp.value = withTiming(variant === 'active' ? 0.1 : 0.05, { duration: 200 });
    }, [variant, scale, shadowOp]);

    const handlePress = useCallback(() => {
      onPress(order);
    }, [order, onPress]);

    const resolvedStripColor = config.strip;

    // ─── Shadow config ────────────────────────────────────────
    const shadowStyle = variant === 'active'
      ? {
          shadowColor: config.shadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 12,
          elevation: 3,
        }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 6,
          elevation: 1,
        };

    // ─── Store name color ─────────────────────────────────────
    const storeNameColor =
      variant === 'active'
        ? theme.colors.textStrong
        : variant === 'past'
          ? theme.colors.textPrimary
          : theme.colors.textSecondary;

    return (
      <Animated.View
        entering={
          FadeInDown
            .delay(Math.min(index * 80, 400))
            .springify()
            .damping(18)
            .stiffness(200)
        }
        style={[
          styles.outerContainer,
          {
            backgroundColor: variant === 'active' ? theme.colors.card : VARIANT_BG[variant],
            ...shadowStyle,
          },
          animatedCardStyle,
        ]}
      >
        <View style={styles.cardRow}>
          {/* Accent Strip */}
          <OrderCardAccentStrip
            color={resolvedStripColor}
            opacity={config.stripOpacity}
          />

          {/* Card Content */}
          <Pressable
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.contentArea}
          accessibilityRole="button"
          accessibilityLabel={`${order.storeName} ${t('orders.orderNumber', { number: order.orderNumber })}`}
        >
          {/* Zone 1: Header — avatar + info + badge */}
          <View style={styles.zone1}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: VARIANT_AVATAR_OPACITY[variant],
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontFamily: theme.font('700') }]}>
                {initial}
              </Text>
            </View>

            <View style={[styles.infoColumn, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                style={[
                  styles.storeName,
                  {
                    color: storeNameColor,
                    fontFamily: theme.font('600'),
                    textAlign: 'right',
                    writingDirection: direction,
                  },
                ]}
                numberOfLines={1}
              >
                {order.storeName}
              </Text>
              <Text
                style={[
                  styles.orderNumber,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.font('400'),
                    textAlign: 'right',
                    writingDirection: direction,
                  },
                ]}
                numberOfLines={1}
              >
                {t('orders.orderNumber', { number: order.orderNumber })}
              </Text>
            </View>

            <OrderStatusBadge
              status={order.status ?? 1}
              isPast={isPast}
            />
          </View>

          {/* Zone 2: Body — varies by variant */}
          <View style={styles.zone2}>
            {variant === 'active' && (
              <OrderMiniProgress status={order.status ?? 1} />
            )}
            {variant === 'past' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#15803D', opacity: 0.7, fontFamily: theme.font('400'), writingDirection: direction }}>
                  {'\u2713'}
                </Text>
                <Text
                  style={[
                    styles.pastLabel,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.font('400'),
                      writingDirection: direction,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t('orders.statusDelivered')} {'\u00B7'} {getRelativeDate(order.createdAt, i18n.language, t)}
                </Text>
              </View>
            )}
            {variant === 'cancelled' && order.items && order.items.length > 0 && (
              <Text
                style={[
                  styles.cancelledItems,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.font('400'),
                    writingDirection: direction,
                  },
                ]}
                numberOfLines={1}
              >
                {order.items.slice(0, 2).map((i) => i.name).join(' \u00B7 ')}
                {order.items.length > 2 ? ` +${order.items.length - 2}` : ''}
              </Text>
            )}
          </View>

          {/* Zone 3: Footer — date + item count + price */}
          <View style={styles.zone3}>
            {/* Row 1: for past variant with reorder, omit date (shown in Zone 2) */}
            {variant === 'past' && onReorder ? (
              <View style={styles.zone3Row1}>
                <Text
                  style={[
                    styles.footerText,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.font('400'),
                      writingDirection: direction,
                    },
                  ]}
                >
                  {t('orders.itemsCount', { count: order.itemCount })}
                </Text>
                <Text
                  style={[
                    styles.price,
                    {
                      color: theme.colors.textStrong,
                      fontFamily: theme.font('700'),
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  {order.totalAmount.toFixed(0)} {'\u20AA'}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.footerText,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.font('400'),
                      writingDirection: direction,
                    },
                  ]}
                >
                  {formatDate(order.createdAt, i18n.language)}
                </Text>

                <Text
                  style={[
                    styles.footerText,
                    {
                      color: theme.colors.textSecondary,
                      fontFamily: theme.font('400'),
                      writingDirection: direction,
                    },
                  ]}
                >
                  {t('orders.itemsCount', { count: order.itemCount })}
                </Text>

                <Text
                  style={[
                    styles.price,
                    {
                      color: theme.colors.textStrong,
                      fontFamily: theme.font('700'),
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  {order.totalAmount.toFixed(0)} {'\u20AA'}
                </Text>
              </>
            )}
          </View>
        </Pressable>
        </View>

        {/* Reorder button — separate from Pressable to isolate touch targets */}
        {variant === 'past' && onReorder && order.items && order.items.some((i) => i.recipeId) && (
          <View style={styles.reorderRow}>
            <Button
              variant="outlined"
              size="medium"
              title={t('reorder.button')}
              icon={<RotateCcw size={14} color={theme.colors.primary} />}
              loading={isReordering}
              onPress={() => onReorder(order)}
              style={{
                height: 36,
                borderRadius: 18,
                paddingHorizontal: 16,
                alignSelf: 'flex-start',
              }}
              textStyle={{ fontSize: 13 }}
              accessibilityLabel={t('reorder.button')}
            />
          </View>
        )}
      </Animated.View>
    );
  },
  (prev, next) =>
    prev.order.status === next.order.status &&
    prev.order.orderNumber === next.order.orderNumber &&
    prev.order.totalAmount === next.order.totalAmount &&
    prev.order.fetched === next.order.fetched &&
    prev.index === next.index &&
    prev.variant === next.variant &&
    prev.isReordering === next.isReordering &&
    prev.onReorder === next.onReorder,
);

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingVertical: 14,
    paddingStart: 14,
    paddingEnd: 16,
  },
  // ── Zone 1: Header ─────────────────────────────────────────
  zone1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoColumn: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '400',
  },
  // ── Zone 2: Body ───────────────────────────────────────────
  zone2: {
    marginTop: 10,
    paddingStart: 54, // align with text after avatar (44 + 10 gap)
  },
  pastLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  cancelledItems: {
    fontSize: 13,
    fontWeight: '400',
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  // ── Zone 3: Footer ─────────────────────────────────────────
  zone3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '400',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
  },
  // ── Zone 3 two-row layout for past variant ────────────
  zone3Row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  reorderRow: {
    paddingStart: 14,
    paddingEnd: 16,
    paddingBottom: 14,
    marginTop: -4,
  },
});
