import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, SectionList, StyleSheet, RefreshControl, SectionListData, NativeScrollEvent, NativeSyntheticEvent, Text, Pressable, Linking, LayoutChangeEvent, TextInput } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing, interpolateColor } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Search } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useMenu, useStoreInfo, useMenuItemDetail } from '../api/hooks';
import { resolvePhotoUrl } from '../api/client';
import { useStoreStore, useCartStore } from '../stores';
import { BannerCurve } from '../components/store/BannerCurve';
import type { HomeStackParamList } from '../navigation/types';
import type { PublicMenuItem } from '../api/types';
import { MenuItemCard, CARD_GAP } from '../components/menu/MenuItemCard';
import { FloatingCartButton } from '../components/menu/FloatingCartButton';
import { StickyCategoryBar } from '../components/menu/StickyCategoryBar';
import { ItemDetailSheet } from '../sheets/ItemDetailSheet';
import { SkeletonRect } from '../components/ui/SkeletonRect';
import { EmptyState } from '../components/ui/EmptyState';

interface MenuRow {
  left: PublicMenuItem;
  right?: PublicMenuItem;
}

const BANNER_HEIGHT = 200;
const LOGO_SIZE = 110;
const LOGO_OVERLAP = LOGO_SIZE * 0.65;
const FLOATING_BAR_V_PAD = 8;
const FLOATING_BAR_ROW_HEIGHT = 36;
const FLOATING_BAR_HEIGHT = FLOATING_BAR_V_PAD + FLOATING_BAR_ROW_HEIGHT + FLOATING_BAR_V_PAD;

function StoreHeader({ store, isRTL, topInset }: { store: { name: string; logoUrl: string | null; description: string | null; address: string | null; phone: string | null; bannerUrl: string | null }; isRTL: boolean; topInset: number }) {
  const { direction } = useDirection();
  const theme = useTheme();
  const { t } = useTranslation();
  const hasDetails = !!(store.address || store.phone);

  return (
    <View style={headerStyles.wrapper}>
      {/* Banner area */}
      <View style={[headerStyles.banner, { height: BANNER_HEIGHT + topInset }]}>
        {store.bannerUrl ? (
          <>
            <Image source={{ uri: resolvePhotoUrl(store.bannerUrl) }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <View style={headerStyles.bannerOverlay} />
          </>
        ) : (
          <View style={headerStyles.darkBg} />
        )}
        <BannerCurve />
      </View>

      {/* Content below banner — logo floats above */}
      <View style={[headerStyles.content, { paddingTop: LOGO_OVERLAP - 4 }]}>
        {/* Floating logo */}
        {store.logoUrl && (
          <View style={[headerStyles.logoContainer, { top: -LOGO_OVERLAP }]}>
            <Image source={{ uri: resolvePhotoUrl(store.logoUrl) }} style={headerStyles.logo} contentFit="cover" />
          </View>
        )}

        <Text
          style={[headerStyles.name, { color: theme.colors.textStrong, fontFamily: theme.font('700'), writingDirection: direction }]}
          numberOfLines={1}
        >
          {store.name}
        </Text>

        {store.description && (
          <Text style={[headerStyles.description, { color: theme.colors.textSecondary, fontFamily: theme.font('400'), writingDirection: direction }]}>
            {store.description}
          </Text>
        )}

        {hasDetails && (
          <View style={[headerStyles.iconsRow, { flexDirection: 'row' }]}>
            {store.address && (
              <Pressable
                onPress={() => Linking.openURL(`maps:?q=${encodeURIComponent(store.address!)}`)}
                style={({ pressed }) => [headerStyles.iconButton, { backgroundColor: theme.colors.primary + '18', opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={headerStyles.iconEmoji}>📍</Text>
              </Pressable>
            )}
            {store.phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${store.phone}`)}
                style={({ pressed }) => [headerStyles.iconButton, { backgroundColor: theme.colors.primary + '18', opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={headerStyles.iconEmoji}>📞</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  banner: {
    width: '100%',
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
    left: 0,
    right: 0,
    alignItems: 'center',
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
  name: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  description: {
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
});

type Props = NativeStackScreenProps<HomeStackParamList, 'Menu'>;

export function MenuScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const insets = useSafeAreaInsets();
  const slug = route.params?.slug ?? '';

  const setStoreSlug = useStoreStore((s) => s.setSlug);
  const setStoreInfo = useStoreStore((s) => s.setStoreInfo);
  const setStoreError = useStoreStore((s) => s.setError);
  const setStatusBarMode = useStoreStore((s) => s.setStatusBarMode);
  const cartSetStoreSlug = useCartStore((s) => s.setStoreSlug);

  // Transparent status bar on the store page
  useFocusEffect(
    useCallback(() => {
      setStatusBarMode('transparent');
    }, []),
  );

  // Search + filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const sectionListRef = useRef<SectionList<MenuRow>>(null);
  const [tabsOffsetY, setTabsOffsetY] = useState<number | null>(null);
  const [tabsHeight, setTabsHeight] = useState(0);
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const [statusBarPastBanner, setStatusBarPastBanner] = useState(false);
  const stickyProgress = useSharedValue(0);

  useEffect(() => {
    stickyProgress.value = withTiming(showStickyTabs ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [showStickyTabs]);

  const stickyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (stickyProgress.value - 1) * 100 }],
    opacity: stickyProgress.value,
  }));

  // Floating bar transition: transparent → white
  const floatingBarProgress = useSharedValue(0);

  useEffect(() => {
    floatingBarProgress.value = withTiming(statusBarPastBanner ? 1 : 0, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [statusBarPastBanner]);

  const floatingBarBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      floatingBarProgress.value,
      [0, 1],
      ['transparent', '#FFFFFF'],
    ),
  }));

  const floatingSearchBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      floatingBarProgress.value,
      [0, 1],
      ['rgba(255,255,255,0.90)', theme.colors.surfaceSecondary],
    ),
  }));

  const floatingBackBtnBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      floatingBarProgress.value,
      [0, 1],
      ['rgba(255,255,255,0.90)', 'transparent'],
    ),
  }));

  const floatingClearBtnBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      floatingBarProgress.value,
      [0, 1],
      ['rgba(0,0,0,0.3)', theme.colors.textTertiary],
    ),
  }));

  // Debounce search to avoid refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const scrollYRef = useRef(0);
  const [visibleCategory, setVisibleCategory] = useState<string | null>(null);

  const bannerScrollThreshold = BANNER_HEIGHT;

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    scrollYRef.current = y;

    const pastBanner = y >= bannerScrollThreshold;
    setStatusBarPastBanner(pastBanner);

    if (tabsOffsetY !== null && tabsHeight > 0) {
      // Show sticky tabs when inline tabs scroll behind the floating bar
      setShowStickyTabs(y >= tabsOffsetY + tabsHeight - (insets.top + FLOATING_BAR_HEIGHT));
    }

    // Determine which section is currently visible based on scroll position
    const offsets = sectionOffsetsRef.current;
    const entries = Object.entries(offsets);
    if (entries.length > 0) {
      // Sort by Y position ascending
      entries.sort((a, b) => a[1] - b[1]);
      // Find the last section whose offset is at or above the current scroll position
      // Add threshold for sticky bar height so highlighting switches a bit earlier
      const threshold = tabsHeight + 80;
      let current = entries[0]![0];
      for (const [title, offset] of entries) {
        if (offset <= y + threshold) {
          current = title;
        } else {
          break;
        }
      }
      setVisibleCategory(current);
    }
  }, [tabsOffsetY, tabsHeight, insets.top]);

  const handleTabsLayout = useCallback((e: LayoutChangeEvent) => {
    setTabsOffsetY(e.nativeEvent.layout.y);
    setTabsHeight(e.nativeEvent.layout.height);
  }, []);

  // Store Y offsets of each section header for scroll-based active category tracking
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const sectionHeaderRefs = useRef<Record<string, View | null>>({});

  // API queries
  const storeQuery = useStoreInfo(slug);
  const menuQuery = useMenu(slug, debouncedSearch ? { search: debouncedSearch } : undefined);
  const selectedItem = menuQuery.data?.find((i) => i.id === selectedItemId) ?? null;
  const detailQuery = useMenuItemDetail(slug, selectedItemId ?? '');

  // Set store info in Zustand
  useEffect(() => {
    if (slug) {
      setStoreSlug(slug);
      cartSetStoreSlug(slug);
    }
  }, [slug]);

  useEffect(() => {
    if (storeQuery.data) {
      setStoreInfo(storeQuery.data);
    }
  }, [storeQuery.data]);

  useEffect(() => {
    if (storeQuery.error) {
      const err = storeQuery.error as any;
      if (err.statusCode === 404) {
        navigation.replace('Error', { type: 'storeNotFound' });
      } else if (err.statusCode === 403) {
        navigation.replace('Error', { type: 'storefrontDisabled' });
      } else {
        navigation.replace('Error', { type: 'networkError' });
      }
    }
  }, [storeQuery.error]);

  // Build sections from menu items grouped by tags, pre-paired into rows
  const { sections, categories } = useMemo(() => {
    const items = menuQuery.data ?? [];
    const tagMap = new Map<string, PublicMenuItem[]>();

    for (const item of items) {
      const tag = item.tags[0] ?? t('menu.allCategories');
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag)!.push(item);
    }

    const cats = Array.from(tagMap.keys());

    const pairItems = (menuItems: PublicMenuItem[]): MenuRow[] => {
      const rows: MenuRow[] = [];
      for (let i = 0; i < menuItems.length; i += 2) {
        rows.push({ left: menuItems[i]!, right: menuItems[i + 1] });
      }
      return rows;
    };

    const allSections: SectionListData<MenuRow>[] = cats.map((cat) => ({
      title: cat,
      data: pairItems(tagMap.get(cat) ?? []),
    }));

    return { sections: allSections, categories: cats };
  }, [menuQuery.data, t]);


  const handleCategoryPress = useCallback((category: string | null) => {
    setActiveCategory(category);
    if (category !== null) {
      setVisibleCategory(category);
    }
    if (category === null) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: true,
        viewOffset: insets.top + FLOATING_BAR_HEIGHT + tabsHeight,
      });
    } else {
      const sectionIndex = sections.findIndex((s) => s.title === category);
      if (sectionIndex >= 0) {
        sectionListRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex: 0,
          animated: true,
          viewOffset: insets.top + FLOATING_BAR_HEIGHT + tabsHeight,
        });
      }
    }
  }, [sections, tabsHeight]);

  const handleQuickAdd = useCallback((item: PublicMenuItem) => {
    useCartStore.getState().addItem({
      recipeId: item.id,
      name: item.name,
      price: item.sellingPrice,
      photo: item.photos[0] ? resolvePhotoUrl(item.photos[0]) : undefined,
    });
  }, []);

  useEffect(() => {
    setStatusBarMode(statusBarPastBanner ? 'default' : 'transparent');
  }, [statusBarPastBanner]);

  const handleRefresh = useCallback(() => {
    menuQuery.refetch();
    storeQuery.refetch();
  }, []);

  // Loading state — show skeletons
  if (storeQuery.isLoading || menuQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>

        <View style={[styles.skeletonContainer, { paddingTop: insets.top + 20 }]}>
          <SkeletonRect width="50%" height={32} style={styles.skeletonMarginLg} />
          <SkeletonRect width="70%" height={16} style={styles.skeletonMargin} />
          <View style={{ height: 16 }} />
          <SkeletonRect width="100%" height={48} borderRadius={12} style={styles.skeletonMargin} />
          <View style={styles.skeletonTabs}>
            <SkeletonRect width={56} height={36} borderRadius={999} />
            <SkeletonRect width={72} height={36} borderRadius={999} />
            <SkeletonRect width={64} height={36} borderRadius={999} />
            <SkeletonRect width={80} height={36} borderRadius={999} />
          </View>
          <View style={styles.skeletonGrid}>
            <SkeletonRect width="48%" height={220} borderRadius={16} />
            <SkeletonRect width="48%" height={220} borderRadius={16} />
          </View>
          <View style={[styles.skeletonGrid, { marginTop: 12 }]}>
            <SkeletonRect width="48%" height={220} borderRadius={16} />
            <SkeletonRect width="48%" height={220} borderRadius={16} />
          </View>
        </View>
      </View>
    );
  }

  // Empty menu
  if (menuQuery.data && menuQuery.data.length === 0 && !search) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>

        {storeQuery.data && (
          <StoreHeader store={storeQuery.data} isRTL={isRTL} topInset={insets.top} />
        )}
        {/* Floating back button for empty state */}
        <View style={[styles.floatingBar, { paddingTop: insets.top + FLOATING_BAR_V_PAD }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <View style={[styles.floatingBackBtn, { backgroundColor: 'rgba(255,255,255,0.90)' }]}>
              <View style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }}>
                <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>
          </Pressable>
        </View>
        <EmptyState
          title={t('error.emptyMenu')}
          message={t('error.emptyMenuMessage')}
        />
      </View>
    );
  }

  // Render a pre-paired row of cards
  const renderItem = ({ item }: { item: MenuRow }) => (
    <View style={styles.row}>
      <MenuItemCard
        item={item.left}
        onPress={() => setSelectedItemId(item.left.id)}
        onQuickAdd={() => handleQuickAdd(item.left)}
      />
      {item.right ? (
        <MenuItemCard
          item={item.right}
          onPress={() => setSelectedItemId(item.right!.id)}
          onQuickAdd={() => handleQuickAdd(item.right!)}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );

  const renderSectionHeader = ({ section }: { section: SectionListData<MenuRow> }) => {
    const isFirst = sections.length > 0 && sections[0].title === section.title;

    return (
      <View
        ref={(ref) => {
          if (section.title) {
            sectionHeaderRefs.current[section.title as string] = ref;
          }
        }}
        style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}
        onLayout={() => {
          const title = section.title as string;
          const ref = sectionHeaderRefs.current[title];
          if (ref) {
            // measure() gives (x, y, width, height, pageX, pageY)
            // pageY is absolute screen position; add current scrollY to get content-relative offset
            (ref as any).measure(
              (_x: number, _y: number, _w: number, _h: number, _pageX: number, pageY: number) => {
                if (typeof pageY === 'number') {
                  sectionOffsetsRef.current[title] = pageY + scrollYRef.current;
                }
              }
            );
          }
        }}
      >
        {/* Divider above section (skip first) */}
        {!isFirst && (
          <View
            style={[
              styles.sectionDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
        )}
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionAccent, { backgroundColor: theme.colors.primary }]} />
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.textStrong,
                fontFamily: theme.font('700'),
                writingDirection: direction,
              },
            ]}
          >
            {section.title}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Sticky Category Bar — slides down below floating search bar */}
      {categories.length > 0 && (
        <Animated.View
          style={[styles.stickyTabs, { top: insets.top + FLOATING_BAR_HEIGHT }, stickyAnimatedStyle]}
          pointerEvents={showStickyTabs ? 'auto' : 'none'}
        >
          <StickyCategoryBar
            categories={categories}
            activeCategory={visibleCategory}
            onCategoryPress={handleCategoryPress}
          />
        </Animated.View>
      )}

      {/* Menu List with header, search & tabs inside the scroll view */}
      <SectionList<MenuRow>
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.left.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={
          <>
            {storeQuery.data && (
              <StoreHeader store={storeQuery.data} isRTL={isRTL} topInset={insets.top} />
            )}
            {categories.length > 0 && (
              <View onLayout={handleTabsLayout}>
                <StickyCategoryBar
                  categories={categories}
                  activeCategory={visibleCategory}
                  onCategoryPress={handleCategoryPress}
                />
              </View>
            )}
          </>
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        style={{ backgroundColor: theme.colors.surface }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        windowSize={5}
        maxToRenderPerBatch={6}
        refreshControl={
          <RefreshControl
            refreshing={menuQuery.isRefetching}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
          />
        }
      />

      {/* Floating Search Bar + Back Button */}
      <Animated.View
        style={[
          styles.floatingBar,
          { paddingTop: insets.top + FLOATING_BAR_V_PAD },
          floatingBarBgStyle,
        ]}
      >
        {/* Back button */}
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Animated.View style={[styles.floatingBackBtn, floatingBackBtnBgStyle]}>
            <View style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }}>
              <ChevronRight
                size={22}
                color={statusBarPastBanner ? theme.colors.textStrong : 'rgba(0,0,0,0.6)'}
                strokeWidth={2.5}
              />
            </View>
          </Animated.View>
        </Pressable>

        {/* Search input */}
        <Animated.View style={[styles.floatingSearchInput, floatingSearchBgStyle]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('menu.searchPlaceholder')}
            placeholderTextColor={statusBarPastBanner ? theme.colors.textTertiary : 'rgba(0,0,0,0.5)'}
            style={[
              styles.floatingSearchText,
              {
                color: statusBarPastBanner ? theme.colors.textPrimary : 'rgba(0,0,0,0.6)',
                fontFamily: theme.font('400'),
                writingDirection: direction,
                textAlign: direction === 'rtl' ? 'right' : 'left',
              },
            ]}
            selectionColor={theme.colors.primary}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Animated.View
                style={[styles.floatingClearBtn, floatingClearBtnBgStyle]}
              >
                <Text style={styles.floatingClearText}>{'\u2715'}</Text>
              </Animated.View>
            </Pressable>
          ) : (
            <Search
              size={16}
              color={statusBarPastBanner ? theme.colors.textTertiary : 'rgba(0,0,0,0.5)'}
              strokeWidth={2.5}
            />
          )}
        </Animated.View>
      </Animated.View>

      {/* Search no results */}
      {search && menuQuery.data?.length === 0 && (
        <View style={styles.noResultsOverlay}>
          <EmptyState
            title={t('menu.noResults')}
            message={t('menu.noResultsMessage')}
          />
        </View>
      )}

      {/* Floating Cart Button */}
      <FloatingCartButton onPress={() => navigation.navigate('Cart')} />

      {/* Item Detail Bottom Sheet */}
      <ItemDetailSheet
        item={detailQuery.data ?? selectedItem}
        onClose={() => setSelectedItemId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingTop: 24,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  sectionDivider: {
    height: 1,
    opacity: 0.4,
    marginHorizontal: 0,
    marginBottom: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionAccent: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skeletonContainer: {
    padding: 20,
  },
  skeletonMargin: {
    marginBottom: 12,
  },
  skeletonMarginLg: {
    marginBottom: 8,
  },
  skeletonTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  skeletonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  stickyTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  noResultsOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 240,
  },
  floatingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: FLOATING_BAR_V_PAD,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 20,
  },
  floatingBackBtn: {
    width: FLOATING_BAR_ROW_HEIGHT,
    height: FLOATING_BAR_ROW_HEIGHT,
    borderRadius: FLOATING_BAR_ROW_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingSearchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: FLOATING_BAR_ROW_HEIGHT,
    borderRadius: FLOATING_BAR_ROW_HEIGHT / 2,
    paddingHorizontal: 12,
    gap: 8,
  },
  floatingSearchText: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  floatingClearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingClearText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
