import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../../contexts/DirectionContext';
import { AllergenBadge } from './AllergenBadge';
import { QuickAddButton } from './QuickAddButton';
import type { PublicMenuItem } from '../../api/types';
import { resolvePhotoUrl } from '../../api/client';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const IMAGE_HEIGHT = CARD_WIDTH * 1.0;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Placeholder colors for items without photos
const PLACEHOLDER_GRADIENTS = [
  ['#F9EDE0', '#E4BF94'],
  ['#FEE2E2', '#FECACA'],
  ['#DCFCE7', '#BBF7D0'],
  ['#FEF3C7', '#FDE68A'],
  ['#E0E7FF', '#C7D2FE'],
  ['#FCE7F3', '#FBCFE8'],
];

function getPlaceholderColor(id: string): string {
  const index = id.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length;
  return PLACEHOLDER_GRADIENTS[index][0];
}

interface MenuItemCardProps {
  item: PublicMenuItem;
  onPress: () => void;
  onQuickAdd: () => void;
}

export function MenuItemCard({ item, onPress, onQuickAdd }: MenuItemCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { direction } = useDirection();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        { width: CARD_WIDTH, backgroundColor: theme.colors.card },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.sellingPrice} ${t('common.shekel')}`}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.photos.length > 0 ? (
          <Image
            source={{ uri: resolvePhotoUrl(item.photos[0]) }}
            style={[styles.image, { height: IMAGE_HEIGHT }]}
            contentFit="cover"
            transition={300}
            recyclingKey={item.id}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              {
                height: IMAGE_HEIGHT,
                backgroundColor: getPlaceholderColor(item.id),
              },
            ]}
          >
            <View style={styles.placeholderIconContainer}>
              <Text style={styles.placeholderIcon}>{'\u{1F35E}'}</Text>
            </View>
          </View>
        )}

        {/* Quick Add overlaid on image */}
        <View style={styles.quickAddOverlay}>
          <QuickAddButton onPress={onQuickAdd} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.name,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('600'),
              writingDirection: direction,
            },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {item.description ? (
          <Text
            style={[
              styles.description,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.font('400'),
                writingDirection: direction,
              },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        ) : null}

        {/* Allergen icons */}
        {item.allergens?.length > 0 && (
          <View style={styles.allergens}>
            {item.allergens.slice(0, 4).map((allergen) => (
              <AllergenBadge key={allergen.name} allergen={allergen} />
            ))}
          </View>
        )}

        {/* Price */}
        <Text
          style={[
            styles.price,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
              textAlign: 'right',
            },
          ]}
        >
          <Text style={{ writingDirection: 'ltr' }}>
            {item.sellingPrice} {'\u20AA'}
          </Text>
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  imageContainer: {
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: 'relative',
  },
  image: {
    width: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 28,
  },
  quickAddOverlay: {
    position: 'absolute',
    bottom: 8,
    start: 8,
  },
  content: {
    flex: 1,
    padding: 12,
    paddingTop: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  allergens: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 'auto',
    paddingTop: 6,
  },
});

export { CARD_WIDTH, CARD_GAP };
