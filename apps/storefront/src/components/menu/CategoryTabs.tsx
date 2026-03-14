import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  View,
  Image,
} from 'react-native';
import { useTheme } from '../../theme';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryPress: (category: string | null) => void;
}

/** Map category names to 3D icon assets (English + Hebrew) */
const CATEGORY_IMAGES: Record<string, ReturnType<typeof require>> = {
  // English
  Cakes: require('../../../assets/categories/cakes.png'),
  Pastries: require('../../../assets/categories/pastries.png'),
  Cookies: require('../../../assets/categories/cookies.png'),
  Chocolate: require('../../../assets/categories/chocolate.png'),
  Desserts: require('../../../assets/categories/desserts.png'),
  Breads: require('../../../assets/categories/breads.png'),
  French: require('../../../assets/categories/french.png'),
  Classic: require('../../../assets/categories/classic.png'),
  Premium: require('../../../assets/categories/premium.png'),
  Bestseller: require('../../../assets/categories/bestseller.png'),
  Signature: require('../../../assets/categories/signature.png'),
  Holiday: require('../../../assets/categories/holiday.png'),
  Party: require('../../../assets/categories/party.png'),
  Dairy: require('../../../assets/categories/dairy.png'),
  Nuts: require('../../../assets/categories/nuts.png'),
  Quick: require('../../../assets/categories/quick.png'),
  Fillings: require('../../../assets/categories/fillings.png'),
  Seasonal: require('../../../assets/categories/seasonal.png'),
  'Gluten-Free': require('../../../assets/categories/gluten-free.png'),
  // Hebrew
  'עוגות': require('../../../assets/categories/cakes.png'),
  'מאפים': require('../../../assets/categories/pastries.png'),
  'עוגיות': require('../../../assets/categories/cookies.png'),
  'שוקולד': require('../../../assets/categories/chocolate.png'),
  'קינוחים': require('../../../assets/categories/desserts.png'),
  'לחמים': require('../../../assets/categories/breads.png'),
  'צרפתי': require('../../../assets/categories/french.png'),
  'קלאסי': require('../../../assets/categories/classic.png'),
  'פרימיום': require('../../../assets/categories/premium.png'),
  'רב מכר': require('../../../assets/categories/bestseller.png'),
  'סיגנצ׳ר': require('../../../assets/categories/signature.png'),
  'חגים': require('../../../assets/categories/holiday.png'),
  'מסיבות': require('../../../assets/categories/party.png'),
  'חלבי': require('../../../assets/categories/dairy.png'),
  'אגוזים': require('../../../assets/categories/nuts.png'),
  'מהיר': require('../../../assets/categories/quick.png'),
  'מילויים': require('../../../assets/categories/fillings.png'),
  'עונתי': require('../../../assets/categories/seasonal.png'),
  'ללא גלוטן': require('../../../assets/categories/gluten-free.png'),
  'לחם': require('../../../assets/categories/breads.png'),
  'בצקים': require('../../../assets/categories/pastries.png'),
  'טארטים': require('../../../assets/categories/desserts.png'),
  'עוגת שמרים': require('../../../assets/categories/cakes.png'),
  'בורקסים': require('../../../assets/categories/pastries.png'),
  'פיצות': require('../../../assets/categories/breads.png'),
  'רולים': require('../../../assets/categories/pastries.png'),
  'סופגניות': require('../../../assets/categories/desserts.png'),
  'חלות': require('../../../assets/categories/breads.png'),
};

const DEFAULT_IMAGE = require('../../../assets/categories/all.png');

/** Case-insensitive lookup */
const CATEGORY_IMAGES_LOWER = Object.fromEntries(
  Object.entries(CATEGORY_IMAGES).map(([k, v]) => [k.toLowerCase(), v]),
);

function getCategoryImage(category: string) {
  return CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES_LOWER[category.toLowerCase()] ?? DEFAULT_IMAGE;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryPress,
}: CategoryTabsProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const buttonRefs = useRef<Record<string, View | null>>({});

  // Auto-scroll the tab strip to keep the active button visible
  useEffect(() => {
    if (activeCategory && buttonRefs.current[activeCategory]) {
      buttonRefs.current[activeCategory]!.measureLayout(
        scrollRef.current as any,
        (x) => {
          scrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
        },
        () => {},
      );
    }
  }, [activeCategory]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isActive = category === activeCategory;
          const imageSource = getCategoryImage(category);

          return (
            <Pressable
              key={category}
              ref={(ref) => { buttonRefs.current[category] = ref as any; }}
              onPress={() => onCategoryPress(isActive ? null : category)}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive
                    ? `${theme.colors.primary}15`
                    : theme.colors.surface,
                  borderColor: isActive
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Image
                source={imageSource}
                style={styles.iconImage}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.pillLabel,
                  {
                    color: isActive
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    fontFamily: theme.font(isActive ? '600' : '500'),
                  },
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
    paddingBottom: 10,
    paddingTop: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minWidth: 72,
  },
  iconImage: {
    width: 72,
    height: 72,
    marginVertical: -10,
  },
  pillLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});
