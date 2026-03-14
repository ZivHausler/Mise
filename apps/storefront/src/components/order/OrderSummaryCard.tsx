import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { resolvePhotoUrl } from '../../api/client';
import { Card } from '../ui/Card';

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  photo?: string | null;
}

interface OrderSummaryCardProps {
  items: OrderItem[];
  totalAmount: number;
  collapsible?: boolean;
}

export function OrderSummaryCard({
  items,
  totalAmount,
  collapsible = true,
}: OrderSummaryCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const [expanded, setExpanded] = useState(!collapsible);
  const rotation = useSharedValue(collapsible ? 0 : 180);

  const toggleExpanded = () => {
    if (!collapsible) return;
    const next = !expanded;
    setExpanded(next);
    rotation.value = withTiming(next ? 180 : 0, { duration: 250 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Card>
      <Pressable
        onPress={toggleExpanded}
        style={styles.header}
        accessibilityRole={collapsible ? 'button' : undefined}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>{'\u{1F4CB}'}</Text>
          <Text
            style={[
              styles.headerLabel,
              {
                color: theme.colors.textStrong,
                fontFamily: theme.font('600'),
                writingDirection: direction,
              },
            ]}
          >
            {t('tracking.orderDetails')}
          </Text>
          <View
            style={[
              styles.itemCountBadge,
              { backgroundColor: `${theme.colors.primary}15` },
            ]}
          >
            <Text
              style={[
                styles.itemCountText,
                { color: theme.colors.primary, fontFamily: theme.font('600') },
              ]}
            >
              {items.length}
            </Text>
          </View>
        </View>
        {collapsible && (
          <Animated.View style={chevronStyle}>
            <Text style={{ color: theme.colors.textTertiary, fontSize: 14 }}>
              {'\u25BC'}
            </Text>
          </Animated.View>
        )}
      </Pressable>

      {expanded && (
        <View style={[styles.itemList, { borderTopColor: theme.colors.border }]}>
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.itemRow,
                index < items.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.border,
                  paddingBottom: 10,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                {item.photo ? (
                  <Image
                    source={{ uri: resolvePhotoUrl(item.photo) }}
                    style={styles.itemPhoto}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.itemPhotoPlaceholder,
                      { backgroundColor: theme.colors.surfaceSecondary },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{'\u{1F370}'}</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.itemName,
                    {
                      color: theme.colors.textPrimary,
                      fontFamily: theme.font('400'),
                      writingDirection: direction,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
              </View>
              <View style={styles.itemPriceCol}>
                <Text
                  style={[
                    styles.itemPriceBreakdown,
                    {
                      color: theme.colors.textTertiary,
                      fontFamily: theme.font('400'),
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  {item.quantity} x {item.unitPrice} {'\u20AA'}
                </Text>
                <Text
                  style={[
                    styles.itemPrice,
                    {
                      color: theme.colors.textStrong,
                      fontFamily: theme.font('600'),
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  {item.unitPrice * item.quantity} {'\u20AA'}
                </Text>
              </View>
            </View>
          ))}

          {/* Total */}
          <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
            <Text
              style={[
                styles.totalLabel,
                {
                  color: theme.colors.textStrong,
                  fontFamily: theme.font('700'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('cart.subtotal')}
            </Text>
            <Text
              style={[
                styles.totalValue,
                {
                  color: theme.colors.primary,
                  fontFamily: theme.font('700'),
                  writingDirection: 'ltr',
                },
              ]}
            >
              {totalAmount} {'\u20AA'}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 10,
  },
  itemPhoto: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  itemPhotoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    flexShrink: 1,
  },
  itemPriceCol: {
    alignItems: 'flex-start',
    marginStart: 8,
  },
  itemPriceBreakdown: {
    fontSize: 12,
    lineHeight: 18,
  },
  itemPrice: {
    fontSize: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
