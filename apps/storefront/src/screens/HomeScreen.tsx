import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import { useDirection } from '../contexts/DirectionContext';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../theme';
import { useStoreStore } from '../stores';
import { useAuthStore } from '../stores/authStore';
import { useStoreInfo, useCustomerProfile, useCustomerOrders, useDiscoverStores } from '../api/hooks';
import { useReorder } from '../hooks/useReorder';
import { OrderAgainSection } from '../components/home/OrderAgainSection';
import { SERVER_ORIGIN, resolvePhotoUrl } from '../api/client';
import type { HomeStackParamList } from '../navigation/types';
import type { TabParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category emoji map
const CATEGORY_EMOJI: Record<string, string> = {
  food_bakery: '\u{1F35E}',
  cafe_coffee: '\u{2615}',
  restaurant: '\u{1F37D}',
  catering_events: '\u{1F370}',
  fashion_clothing: '\u{1F45A}',
  health_beauty: '\u{1F48E}',
  home_living: '\u{1F3E0}',
  arts_crafts: '\u{1F3A8}',
  electronics_tech: '\u{1F4F1}',
  pets: '\u{1F43E}',
  books_education: '\u{1F4DA}',
  sports_outdoors: '\u{26BD}',
  services: '\u{1F527}',
  grocery_market: '\u{1F6D2}',
};

const CATEGORIES = Object.entries(CATEGORY_EMOJI).map(([key, emoji]) => ({ key, emoji }));

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

function StoreCard({ slug, onPress, index }: { slug: string; onPress: () => void; index: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { direction } = useDirection();
  const storeQuery = useStoreInfo(slug);
  const store = storeQuery.data;

  if (!store) {
    return (
      <Animated.View
        entering={FadeInDown.delay(400 + index * 100).springify()}
        style={[styles.storeCard, { backgroundColor: theme.colors.card, borderRadius: 20 }]}
      >
        <View style={[styles.storeImagePlaceholder, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 20 }]} />
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.delay(400 + index * 100).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.storeCard,
          {
            backgroundColor: theme.colors.card,
            borderRadius: 20,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: '#000',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={store.name}
      >
        {/* Store Banner Image */}
        <View style={[styles.storeBanner, { backgroundColor: '#1A1A16', borderRadius: 20 }]}>
          {/* Banner background image or watermark fallback */}
          {store.bannerUrl ? (
            <Image
              source={{ uri: resolvePhotoUrl(store.bannerUrl) }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <View style={styles.bannerGradient}>
              <Text style={styles.bannerWatermark}>
                {store.name.charAt(0)}
              </Text>
            </View>
          )}
          {/* Dark overlay for text readability on banner */}
          {store.bannerUrl && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />}

          {/* Store avatar */}
          <View style={styles.bannerContent}>
            {store.logoUrl ? (
              <Image
                source={{ uri: resolvePhotoUrl(store.logoUrl) }}
                style={[styles.storeAvatar, { borderRadius: 16 }]}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.storeAvatar, { backgroundColor: theme.colors.primary, borderRadius: 16 }]}>
                <Text style={[styles.storeAvatarText, { fontFamily: theme.font('700') }]}>
                  {store.name.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.bannerTextContent}>
              <Text
                style={[styles.storeName, { fontFamily: theme.font('700'), writingDirection: direction }]}
                numberOfLines={1}
              >
                {store.name}
              </Text>
              {store.address && (
                <Text
                  style={[styles.storeAddress, { fontFamily: theme.font('400'), writingDirection: direction }]}
                  numberOfLines={1}
                >
                  {'\u{1F4CD}'} {store.address}
                </Text>
              )}
            </View>
          </View>

          {/* Rating badge */}
          <View style={[styles.ratingBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.ratingText, { fontFamily: theme.font('700') }]}>
              {'\u2B50'} 4.8
            </Text>
          </View>
        </View>

        {/* Store info footer */}
        <View style={styles.storeFooter}>
          <View style={styles.storeTagsRow}>
            {store.categorySubject && (
            <View style={[styles.storeTag, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Text style={[styles.storeTagText, { color: theme.colors.primary, fontFamily: theme.font('600') }]}>
                {CATEGORY_EMOJI[store.categorySubject] ?? '\u{1F37D}'} {t(`home.category.${store.categorySubject}`, store.categorySubject)}
              </Text>
            </View>
            )}
            <View style={[styles.storeTag, { backgroundColor: `${theme.colors.success}15` }]}>
              <Text style={[styles.storeTagText, { color: theme.colors.success, fontFamily: theme.font('600') }]}>
                {'\u{1F552}'} {t('home.openNow')}
              </Text>
            </View>
          </View>

          {store.phone && (
            <Text
              style={[styles.storePhone, { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction }]}
            >
              {'\u{1F4DE}'} {store.phone}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const FadeInFromStart = isRTL ? FadeInLeft : FadeInRight;
  const user = useAuthStore((s) => s.user);
  const setStatusBarMode = useStoreStore((s) => s.setStatusBarMode);
  const heroBannerHeightRef = useRef(0);
  const pastHeroRef = useRef(false);

  // Dark status bar on the home page
  useFocusEffect(
    useCallback(() => {
      setStatusBarMode('dark');
    }, []),
  );

  const handleHeroLayout = useCallback((e: LayoutChangeEvent) => {
    heroBannerHeightRef.current = e.nativeEvent.layout.height;
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const h = heroBannerHeightRef.current;
    const past = h > 0 && y >= h * 0.8;
    if (past !== pastHeroRef.current) {
      pastHeroRef.current = past;
      setStatusBarMode(past ? 'default' : 'dark');
    }
  }, []);

  const { data: profile } = useCustomerProfile();
  const { data: allOrders, isLoading: ordersLoading } = useCustomerOrders();
  const { data: discoveredStores = [] } = useDiscoverStores();
  const { reorder } = useReorder();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredStores = React.useMemo(
    () => selectedCategory
      ? discoveredStores.filter((s) => s.categorySubject === selectedCategory)
      : discoveredStores,
    [discoveredStores, selectedCategory],
  );

  // Delivered orders for the "Order Again" section
  const deliveredOrders = React.useMemo(
    () =>
      (allOrders ?? [])
        .filter((o) => o.fetched && o.status === 4)
        .slice(0, 10),
    [allOrders],
  );

  const handleSeeAllOrders = useCallback(() => {
    navigation.getParent()?.navigate('OrdersTab', { screen: 'OrdersList' });
  }, [navigation]);

  // Prefer backend-fetched firstName; fall back to auth store for instant render
  const displayFirstName = profile?.firstName ?? user?.firstName;
  const greeting = displayFirstName
    ? t('home.greetingName', { name: displayFirstName })
    : t('home.greeting');

  const handleStorePress = useCallback((slug: string) => {
    navigation.navigate('Menu', { slug });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero Section — Dark banner like Uber Eats */}
        <View style={[styles.heroBanner, { backgroundColor: '#1A1A16' }]} onLayout={handleHeroLayout}>
          <SafeAreaView edges={['top']}>
            {/* Top bar: greeting + avatar */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={styles.topBar}
            >
              <View style={styles.greetingSection}>
                <Text
                  style={[styles.greetingText, { fontFamily: theme.font('700'), writingDirection: direction }]}
                >
                  {greeting}
                </Text>
                <Text
                  style={[styles.greetingSubtext, { fontFamily: theme.font('400'), writingDirection: direction }]}
                >
                  {t('home.whatToCook')}
                </Text>
              </View>

              <View
                style={[styles.avatarButton, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.avatarText, { fontFamily: theme.font('700') }]}>
                  {(profile?.firstName ?? user?.firstName)?.charAt(0) || '\u{1F464}'}
                </Text>
              </View>
            </Animated.View>

            {/* Promo banner inside hero */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={[styles.promoBanner, { backgroundColor: `${theme.colors.primary}25` }]}
            >
              <View style={styles.promoContent}>
                <Text style={[styles.promoTitle, { fontFamily: theme.font('700'), writingDirection: direction }]}>
                  {t('home.promoTitle')}
                </Text>
                <Text style={[styles.promoSubtitle, { fontFamily: theme.font('400'), writingDirection: direction }]}>
                  {t('home.promoSubtitle')}
                </Text>
              </View>
              <Text style={styles.promoEmoji}>{'\u{1F389}'}</Text>
            </Animated.View>
          </SafeAreaView>
        </View>

        {/* Category icons — horizontally scrollable */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {CATEGORIES.map((cat, idx) => {
                const isActive = selectedCategory === cat.key;
                return (
                <Animated.View
                  key={cat.key}
                  entering={FadeInFromStart.delay(350 + idx * 60).springify()}
                >
                  <Pressable
                    onPress={() => setSelectedCategory(isActive ? null : cat.key)}
                    style={({ pressed }) => [
                      styles.categoryItem,
                      { transform: [{ scale: pressed ? 0.92 : 1 }] },
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryIconCircle,
                        {
                          backgroundColor: isActive
                            ? `${theme.colors.primary}20`
                            : theme.colors.surfaceSecondary,
                          borderWidth: isActive ? 2 : 0,
                          borderColor: isActive ? theme.colors.primary : 'transparent',
                        },
                      ]}
                    >
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        {
                          color: isActive ? theme.colors.primary : theme.colors.textPrimary,
                          fontFamily: theme.font(isActive ? '600' : '500'),
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {t(`home.category.${cat.key}`)}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Section: Order Again */}
        <OrderAgainSection
          orders={deliveredOrders}
          isLoading={ordersLoading}
          onReorder={reorder}
          onSeeAll={handleSeeAllOrders}
        />

        {/* Section: Our Stores */}
        <View style={styles.storesSection}>
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.sectionHeader}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.textStrong, fontFamily: theme.font('700'), writingDirection: direction },
              ]}
            >
              {t('home.nearbyStores')}
            </Text>
            <Text
              style={[
                styles.sectionSeeAll,
                { color: theme.colors.primary, fontFamily: theme.font('600') },
              ]}
            >
              {t('home.seeAll')}
            </Text>
          </Animated.View>

          {/* Store cards */}
          {filteredStores.length > 0 ? (
            filteredStores.map((store, idx) => (
              <StoreCard
                key={store.slug}
                slug={store.slug}
                index={idx}
                onPress={() => handleStorePress(store.slug)}
              />
            ))
          ) : selectedCategory ? (
            <View style={styles.emptyCategory}>
              <Text style={styles.emptyCategoryEmoji}>
                {CATEGORIES.find((c) => c.key === selectedCategory)?.emoji ?? '🔍'}
              </Text>
              <Text style={[styles.emptyCategoryText, { color: theme.colors.textSecondary, fontFamily: theme.font('500') }]}>
                {t('home.noStoresInCategory')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ─── Hero Banner ─────────────────────────
  heroBanner: {
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  greetingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C4823E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  promoBanner: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  promoEmoji: {
    fontSize: 36,
    marginStart: 12,
  },

  // ─── Categories ──────────────────────────
  categoriesSection: {
    marginTop: 20,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 4,
  },
  categoryItem: {
    alignItems: 'center',
    width: 76,
  },
  categoryIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryEmoji: {
    fontSize: 30,
  },
  categoryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },

  // ─── Stores Section ──────────────────────
  storesSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  sectionSeeAll: {
    fontSize: 14,
  },

  // ─── Store Card ──────────────────────────
  storeCard: {
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  storeBanner: {
    height: 180,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerWatermark: {
    fontSize: 160,
    color: 'rgba(255,255,255,0.04)',
    fontWeight: '900',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  storeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  storeAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
  },
  bannerTextContent: {
    flex: 1,
  },
  storeName: {
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  storeAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    end: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  storeFooter: {
    padding: 14,
    gap: 8,
  },
  storeTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  storeTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  storeTagText: {
    fontSize: 12,
  },
  storePhone: {
    fontSize: 13,
  },
  storeImagePlaceholder: {
    height: 180,
  },
  emptyCategory: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyCategoryEmoji: {
    fontSize: 40,
  },
  emptyCategoryText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
