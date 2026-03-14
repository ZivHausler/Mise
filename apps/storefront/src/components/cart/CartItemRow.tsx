import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { QuantityControl } from './QuantityControl';
import type { CartItem } from '../../stores/cartStore';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
}

export function CartItemRow({ item, onUpdateQuantity }: CartItemRowProps) {
  const theme = useTheme();
  const { direction } = useDirection();
  const lineTotal = item.price * item.quantity;

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: theme.colors.border },
      ]}
    >
      {/* Quantity control — first in code, rendered leftmost by row-reverse */}
      <QuantityControl
        quantity={item.quantity}
        onIncrease={() => onUpdateQuantity(item.quantity + 1)}
        onDecrease={() => onUpdateQuantity(item.quantity - 1)}
      />

      {/* Name + Price — middle */}
      <View style={styles.details}>
        <Text
          style={[
            styles.name,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('600'),
              writingDirection: direction,
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.notes ? (
          <Text
            style={[
              styles.note,
              {
                color: theme.colors.textTertiary,
                fontFamily: theme.font('400'),
                writingDirection: direction,
              },
            ]}
            numberOfLines={1}
          >
            {item.notes}
          </Text>
        ) : null}
        <Text
          style={[
            styles.price,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.font('600'),
            },
          ]}
        >
          {item.quantity > 1
            ? `${item.quantity} x ${'\u20AA'}${item.price.toFixed(0)}  ·  ${'\u20AA'}${lineTotal.toFixed(0)}`
            : `${'\u20AA'}${lineTotal.toFixed(0)}`}
        </Text>
      </View>

      {/* Image — last in code, rendered rightmost by row-reverse */}
      {item.photo ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.photo }}
            style={[
              styles.image,
              {
                borderRadius: theme.sizing.imageBorderRadius,
                width: 56,
                height: 56,
              },
            ]}
            contentFit="cover"
            recyclingKey={item.recipeId}
          />
        </View>
      ) : (
        <View
          style={[
            styles.imagePlaceholder,
            {
              borderRadius: theme.sizing.imageBorderRadius,
              backgroundColor: theme.colors.surfaceSecondary,
            },
          ]}
        >
          <Text style={styles.placeholderEmoji}>{'\u{1F35E}'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    minHeight: 84,
  },
  imageWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 24,
  },
  details: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});
