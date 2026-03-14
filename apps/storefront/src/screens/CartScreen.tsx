import React, { useCallback, useRef } from 'react';
import { View, FlatList, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type BottomSheetType from '@gorhom/bottom-sheet';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useCartStore, useStoreStore } from '../stores';
import { useAuthStore } from '../stores/authStore';
import type { HomeStackParamList } from '../navigation/types';
import type { CartItem } from '../stores/cartStore';

import { ChevronRight } from 'lucide-react-native';
import { SwipeableCartItem } from '../components/cart/SwipeableCartItem';
import { CartSummary } from '../components/cart/CartSummary';
import { EmptyState } from '../components/ui/EmptyState';
import { IconButton } from '../components/ui/IconButton';
import { SignInBottomSheet } from '../sheets/SignInBottomSheet';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const user = useAuthStore((s) => s.user);
  const setStatusBarMode = useStoreStore((s) => s.setStatusBarMode);
  const bottomSheetRef = useRef<BottomSheetType>(null);

  useFocusEffect(
    useCallback(() => {
      setStatusBarMode('default');
    }, []),
  );

  const handleCheckout = useCallback(() => {
    if (!user || user.provider === 'guest') {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      navigation.navigate('Checkout');
    }
  }, [user, navigation]);

  const handleSignInSuccess = useCallback(() => {
    bottomSheetRef.current?.close();
    setTimeout(() => navigation.navigate('Checkout'), 300);
  }, [navigation]);

  const handleDelete = useCallback(
    (recipeId: string) => {
      removeItem(recipeId);
    },
    [removeItem],
  );

  const handleUpdateQuantity = useCallback(
    (recipeId: string, quantity: number) => {
      updateQuantity(recipeId, quantity);
    },
    [updateQuantity],
  );

  const renderItem = ({ item, index }: { item: CartItem; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
      <SwipeableCartItem
        item={item}
        onDelete={() => handleDelete(item.recipeId)}
        onUpdateQuantity={(qty) => handleUpdateQuantity(item.recipeId, qty)}
      />
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <SafeAreaView
        style={styles.container}
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
          <IconButton
            icon={
              <View style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }}>
                <ChevronRight size={24} color={theme.colors.textPrimary} strokeWidth={2} />
              </View>
            }
            onPress={() => navigation.goBack()}
            accessibilityLabel={t('common.back')}
          />
          <View style={styles.headerCenter}>
            <Text
              style={[
                styles.headerTitle,
                {
                  color: theme.colors.textStrong,
                  fontFamily: theme.font('700'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('cart.title')}
            </Text>
            {items.length > 0 && (
              <View
                style={[
                  styles.itemCountBadge,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.itemCountText,
                    {
                      color: theme.colors.onPrimary,
                      fontFamily: theme.font('600'),
                    },
                  ]}
                >
                  {items.reduce((sum, i) => sum + i.quantity, 0)}
                </Text>
              </View>
            )}
          </View>
          {items.length > 0 ? (
            <Pressable
              onPress={clear}
              hitSlop={8}
              style={({ pressed }) => [
                styles.clearButton,
                {
                  backgroundColor: pressed ? `${theme.colors.error}15` : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.clearAll,
                  {
                    color: theme.colors.error,
                    fontFamily: theme.font('500'),
                  },
                ]}
              >
                {t('cart.clearAll')}
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        {/* Cart Items or Empty State */}
        {items.length === 0 ? (
          <EmptyState
            title={t('cart.empty')}
            message={t('cart.emptyMessage')}
            actionLabel={t('cart.browseMenu')}
            onAction={() => navigation.goBack()}
          />
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(item) => item.recipeId}
              renderItem={renderItem}
              contentContainerStyle={[
                styles.listContent,
                { backgroundColor: theme.colors.card },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={false}
              overScrollMode="never"
              ItemSeparatorComponent={() => null}
            />

            {/* Cart Summary (sticky bottom) */}
            <CartSummary
              subtotal={subtotal}
              onCheckout={handleCheckout}
            />
          </>
        )}
      </SafeAreaView>

      {/* Sign-In Bottom Sheet — outside SafeAreaView so backdrop covers status bar */}
      <SignInBottomSheet
        ref={bottomSheetRef}
        onSuccess={handleSignInSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  itemCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 8,
    paddingTop: 4,
  },
});
