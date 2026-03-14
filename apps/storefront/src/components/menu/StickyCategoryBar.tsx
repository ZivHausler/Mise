import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View, Dimensions, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PillLayout {
  x: number;
  width: number;
}

interface StickyCategoryBarProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryPress: (category: string | null) => void;
}

export function StickyCategoryBar({
  categories,
  activeCategory,
  onCategoryPress,
}: StickyCategoryBarProps) {
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const scrollRef = useRef<ScrollView>(null);
  const [pillLayouts, setPillLayouts] = useState<Record<string, PillLayout>>({});
  const contentWidthRef = useRef(0);

  // Reverse array for RTL instead of flexDirection row-reverse.
  // Force direction: 'ltr' on the scroll wrapper so scrollTo coordinates are predictable.
  const displayCategories = isRTL ? [...categories].reverse() : categories;

  const handlePillLayout = useCallback((category: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setPillLayouts((prev) => {
      // Skip update if values unchanged to avoid infinite loops
      const existing = prev[category];
      if (existing && Math.abs(existing.x - x) < 1 && Math.abs(existing.width - width) < 1) {
        return prev;
      }
      return { ...prev, [category]: { x, width } };
    });
  }, []);

  // Center the active pill whenever it changes or layouts update
  useEffect(() => {
    if (!activeCategory) return;
    const pill = pillLayouts[activeCategory];
    if (!pill || !contentWidthRef.current) return;

    const pillCenter = pill.x + pill.width / 2;
    const targetX = pillCenter - SCREEN_WIDTH / 2;
    const maxScroll = Math.max(0, contentWidthRef.current - SCREEN_WIDTH);
    const clampedX = Math.max(0, Math.min(targetX, maxScroll));

    scrollRef.current?.scrollTo({ x: clampedX, animated: true });
  }, [activeCategory, pillLayouts]);

  return (
    // Force LTR so ScrollView scroll coordinates aren't flipped by inherited RTL direction
    <View style={[styles.container, { direction: 'ltr' }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={(w) => { contentWidthRef.current = w; }}
      >
        {displayCategories.map((category) => {
          const isActive = category === activeCategory;

          return (
            <Pressable
              key={category}
              onLayout={(e) => handlePillLayout(category, e)}
              onPress={() => onCategoryPress(isActive ? null : category)}
              style={[
                styles.pill,
                isActive && styles.pillActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.label,
                  { fontFamily: theme.font(isActive ? '600' : '400'), writingDirection: direction },
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_WIDTH / 2,
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillActive: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  label: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
  },
  labelActive: {
    color: '#000000',
  },
});
