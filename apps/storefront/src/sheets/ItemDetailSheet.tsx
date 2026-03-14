import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetFooter,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useCartStore, useUIStore } from '../stores';
import { useHaptics } from '../hooks/useHaptics';
import { AllergenBadge } from '../components/menu/AllergenBadge';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { QuantityControl } from '../components/cart/QuantityControl';
import type { PublicMenuItem, PublicMenuItemDetail } from '../api/types';
import { resolvePhotoUrl } from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RLM = '\u200F';

/** Fix RTL punctuation by inserting a Right-to-Left Mark before punctuation characters */
function fixRTLPunctuation(text: string): string {
  return text.replace(/([.,:;!?،؛\-–—])/g, `${RLM}$1`);
}
const IMAGE_H_PADDING = 16;
const INSET_IMAGE_WIDTH = SCREEN_WIDTH - IMAGE_H_PADDING * 2;
const HERO_HEIGHT = INSET_IMAGE_WIDTH * 0.75;

const PLACEHOLDER_COLORS = [
  '#F9EDE0',
  '#FEE2E2',
  '#DCFCE7',
  '#FEF3C7',
  '#E0E7FF',
  '#FCE7F3',
];

interface ItemDetailSheetProps {
  item: PublicMenuItem | PublicMenuItemDetail | null;
  onClose: () => void;
}

export function ItemDetailSheet({ item, onClose }: ItemDetailSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((s) => s.addItem);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const sheetOpened = useUIStore((s) => s.sheetOpened);
  const sheetClosed = useUIStore((s) => s.sheetClosed);

  React.useEffect(() => {
    if (item) {
      setQuantity(1);
      setNotes('');
      sheetOpened();
      return () => sheetClosed();
    }
  }, [item?.id]);

  const handleAddToCart = useCallback(() => {
    if (!item) return;
    haptics.impactMedium();
    addItem({
      recipeId: item.id,
      name: item.name,
      price: item.sellingPrice,
      quantity,
      notes: notes || undefined,
      photo: item.photos[0]
        ? resolvePhotoUrl(item.photos[0])
        : undefined,
    });
    onClose();
  }, [item, quantity, notes, addItem, haptics, onClose]);

  const handleIncrement = useCallback(() => {
    haptics.selectionChanged();
    setQuantity((q) => q + 1);
  }, [haptics]);

  const handleDecrement = useCallback(() => {
    haptics.selectionChanged();
    setQuantity((q) => Math.max(1, q - 1));
  }, [haptics]);

  const totalPrice = item ? item.sellingPrice * quantity : 0;

  const renderFooter = useCallback(
    (props: any) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: theme.colors.textStrong,
              paddingBottom: 12,
            },
          ]}
        >
          {quantity > 1 && (
            <View style={styles.priceBreakdown}>
              <Text
                style={[
                  styles.priceBreakdownLeft,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.font('400'),
                    writingDirection: 'ltr',
                  },
                ]}
              >
                {quantity} x {'\u20AA'}{item?.sellingPrice}
              </Text>
              <Text
                style={[
                  styles.priceBreakdownRight,
                  {
                    color: theme.colors.textStrong,
                    fontFamily: theme.font('700'),
                    writingDirection: 'ltr',
                  },
                ]}
              >
                {'\u20AA'}{totalPrice}
              </Text>
            </View>
          )}
          <Button
            title={t('menu.addToCartWithPrice', { price: totalPrice })}
            onPress={handleAddToCart}
            variant="primary"
            size="large"
            style={styles.addBtn}
          />
        </View>
      </BottomSheetFooter>
    ),
    [insets.bottom, theme, quantity, item?.sellingPrice, totalPrice, t, handleAddToCart],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.65}
        pressBehavior="close"
      />
    ),
    [],
  );

  const detailItem = item as PublicMenuItemDetail | null;
  const hasIngredients =
    detailItem &&
    'ingredients' in detailItem &&
    detailItem.ingredients?.length > 0;

  if (!item) return null;

  const hasPhoto = item.photos.length > 0;
  const placeholderColor =
    PLACEHOLDER_COLORS[item.id.charCodeAt(0) % PLACEHOLDER_COLORS.length];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.primary,
        width: 40,
        height: 5,
        borderRadius: 3,
      }}
      backgroundStyle={{
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        backgroundColor: theme.colors.surface,
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===================== INSET HERO IMAGE ===================== */}
        {hasPhoto ? (
          <View style={styles.heroContainer}>
            <View
              style={[
                styles.heroInset,
                {
                  shadowColor: theme.colors.textStrong,
                },
              ]}
            >
              <Image
                source={{ uri: resolvePhotoUrl(item.photos[0]) }}
                style={styles.heroImage}
                contentFit="cover"
                transition={400}
              />
            </View>
          </View>
        ) : (
          <View style={styles.heroContainer}>
            <View
              style={[
                styles.heroInset,
                styles.placeholderHero,
                { backgroundColor: placeholderColor },
              ]}
            >
              <View style={styles.placeholderCircle}>
                <Text style={styles.placeholderEmoji}>{'\u{1F35E}'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ===================== CONTENT ===================== */}
        <View style={[styles.content, { direction }]}>
          {/* --- Name --- */}
          <Text
            style={[
              styles.name,
              {
                color: theme.colors.textStrong,
                fontFamily: theme.font('700'),
                writingDirection: direction,
              },
            ]}
          >
            {item.name}
          </Text>

          {/* --- Decorative accent bar --- */}
          <View
            style={[
              styles.accentBar,
              { backgroundColor: theme.colors.primary },
            ]}
          />

          {/* --- Price pill + Tags row --- */}
          <View style={styles.priceTagsRow}>
            <View
              style={[
                styles.pricePill,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.pricePillText,
                  {
                    color: theme.colors.onPrimary,
                    fontFamily: theme.font('700'),
                    writingDirection: 'ltr',
                  },
                ]}
              >
                {'\u20AA'}{item.sellingPrice}
              </Text>
            </View>

            {item.tags?.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScroll}
              >
                {item.tags.map((tag, idx) => (
                  <View
                    key={`${tag}-${idx}`}
                    style={[
                      styles.tagPill,
                      { backgroundColor: theme.colors.surfaceSecondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        {
                          color: theme.colors.textSecondary,
                          fontFamily: theme.font('500'),
                        },
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* --- Description --- */}
          {!!item.description && (
            <View style={isRTL ? styles.rtlBlock : undefined}>
              <Text
                style={[
                  styles.description,
                  {
                    color: theme.colors.textSecondary,
                    fontFamily: theme.font('400'),
                    writingDirection: direction,
                  },
                ]}
              >
                {item.description}
              </Text>
            </View>
          )}

          {/* --- Allergens --- */}
          {item.allergens?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.allergenScroll}
            >
              {item.allergens.map((allergen, idx) => (
                <View key={`${allergen.label}-${idx}`} style={styles.allergenChip}>
                  <AllergenBadge allergen={allergen} size={22} />
                  <Text
                    style={[
                      styles.allergenLabel,
                      {
                        color: theme.colors.textSecondary,
                        fontFamily: theme.font('400'),
                      },
                    ]}
                  >
                    {allergen.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* --- Ingredients grid chips --- */}
          {hasIngredients && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.colors.textPrimary,
                    fontFamily: theme.font('600'),
                    writingDirection: direction,
                  },
                ]}
              >
                {t('menu.ingredients')}
              </Text>
              <View style={styles.ingredientGrid}>
                {detailItem!.ingredients.map((ing, idx) => (
                  <View
                    key={`${ing.name}-${idx}`}
                    style={[
                      styles.ingredientChip,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ingredientName,
                        {
                          color: theme.colors.textPrimary,
                          fontFamily: theme.font('500'),
                        },
                      ]}
                    >
                      {ing.name}
                    </Text>
                    {ing.quantity != null && (
                      <Text
                        style={[
                          styles.ingredientQty,
                          {
                            color: theme.colors.textTertiary,
                            fontFamily: theme.font('400'),
                          },
                        ]}
                      >
                        {ing.quantity}
                        {ing.unit ? ` ${ing.unit}` : ''}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* --- Notes input --- */}
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.font('600'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('menu.addNote')}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('menu.notePlaceholder')}
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                styles.noteInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  fontFamily: theme.font('400'),
                  backgroundColor: theme.colors.card,
                  writingDirection: direction,
                  textAlign: direction === 'rtl' ? 'right' : 'left',
                },
              ]}
              selectionColor={theme.colors.primary}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* --- Quantity controls --- */}
          <View style={styles.quantitySection}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.font('600'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('menu.quantity')}
            </Text>
            <View style={styles.quantityCenter}>
              <QuantityControl
                quantity={quantity}
                onIncrease={handleIncrement}
                onDecrease={handleDecrement}
                size="large"
              />
            </View>
          </View>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 200,
  },

  /* ===== Inset Hero ===== */
  heroContainer: {
    paddingHorizontal: IMAGE_H_PADDING,
    paddingTop: 12,
    paddingBottom: 4,
  },
  heroInset: {
    width: INSET_IMAGE_WIDTH,
    height: HERO_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderHero: {
    height: HERO_HEIGHT * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },

  /* ===== Content ===== */
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  name: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  accentBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: -8,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  rtlBlock: {
    direction: 'rtl',
    alignSelf: 'stretch',
  },

  /* ===== Price + Tags row ===== */
  priceTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  pricePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pricePillText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tagsScroll: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 13,
  },

  /* ===== Sections ===== */
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    letterSpacing: 0.2,
  },

  /* ===== Allergens ===== */
  allergenScroll: {
    flexDirection: 'row',
    gap: 4,
  },
  allergenChip: {
    alignItems: 'center',
    gap: 2,
  },
  allergenLabel: {
    fontSize: 11,
    textAlign: 'center',
  },

  /* ===== Ingredients grid ===== */
  ingredientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  ingredientName: {
    fontSize: 13,
  },
  ingredientQty: {
    fontSize: 11,
  },

  /* ===== Notes ===== */
  noteInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 56,
  },

  /* ===== Quantity ===== */
  quantitySection: {
    gap: 12,
  },
  quantityCenter: {
    alignItems: 'center',
  },

  /* ===== Footer ===== */
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 0,
    gap: 8,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  priceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  priceBreakdownLeft: {
    fontSize: 14,
  },
  priceBreakdownRight: {
    fontSize: 18,
  },
  addBtn: {
    width: '100%' as any,
    borderRadius: 16,
    height: 56,
  },
});
