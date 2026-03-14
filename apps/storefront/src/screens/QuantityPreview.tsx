/**
 * Temporary preview screen — 3 redesigns of the quantity section
 * inside ItemDetailSheet. Delete after choosing a concept.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
  SlideInUp,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Minus } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useHaptics } from '../hooks/useHaptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─────────────────────────────────────────────────────────────────────────────
// Shared: fake "Add to Cart" footer for context
// ─────────────────────────────────────────────────────────────────────────────
function FakeFooter({
  quantity,
  unitPrice,
}: {
  quantity: number;
  unitPrice: number;
}) {
  const theme = useTheme();
  const total = quantity * unitPrice;

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.textStrong,
        },
      ]}
    >
      {quantity > 1 && (
        <View style={styles.priceRow}>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.textSecondary,
              fontFamily: theme.font('400'),
              writingDirection: 'ltr',
            }}
          >
            {quantity} x ₪{unitPrice}
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
              writingDirection: 'ltr',
            }}
          >
            ₪{total}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.fakeAddBtn,
          { backgroundColor: theme.colors.primary, borderRadius: 16 },
        ]}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.colors.onPrimary,
            fontFamily: theme.font('600'),
          }}
        >
          הוסף לסל · ₪{total}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT A — "Inline Pill Stepper"
// Slim pill-shaped row: [ − ]  qty  [ + ] with no card border.
// Buttons are soft-filled circles. Number slides vertically.
// ─────────────────────────────────────────────────────────────────────────────
function ConceptA() {
  const theme = useTheme();
  const haptics = useHaptics();
  const [quantity, setQuantity] = useState(1);
  const scaleL = useSharedValue(1);
  const scaleR = useSharedValue(1);
  const qtyTranslateY = useSharedValue(0);
  const qtyOpacity = useSharedValue(1);
  const qtyScale = useSharedValue(1);

  const handleInc = useCallback(() => {
    haptics.selectionChanged();
    // Kick out upward, then snap new value in
    qtyTranslateY.value = -14;
    qtyOpacity.value = 0;
    setQuantity((q) => q + 1);
    qtyTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
    qtyOpacity.value = withTiming(1, { duration: 150 });
    qtyScale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12 }),
    );
  }, [haptics, qtyTranslateY, qtyOpacity, qtyScale]);

  const handleDec = useCallback(() => {
    haptics.selectionChanged();
    // Kick out downward, then snap new value in
    qtyTranslateY.value = 14;
    qtyOpacity.value = 0;
    setQuantity((q) => Math.max(1, q - 1));
    qtyTranslateY.value = withSpring(0, { damping: 16, stiffness: 220 });
    qtyOpacity.value = withTiming(1, { duration: 150 });
    qtyScale.value = withSequence(
      withSpring(0.85, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12 }),
    );
  }, [haptics, qtyTranslateY, qtyOpacity, qtyScale]);

  const leftAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scaleL.value }],
  }));
  const rightAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scaleR.value }],
  }));
  const qtyAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: qtyTranslateY.value },
      { scale: qtyScale.value },
    ],
    opacity: qtyOpacity.value,
  }));

  return (
    <View style={styles.conceptWrap}>
      {/* Label */}
      <Text
        style={[
          styles.sectionTitle,
          {
            color: theme.colors.textPrimary,
            fontFamily: theme.font('600'),
          },
        ]}
      >
        כמות
      </Text>

      {/* Pill */}
      <View
        style={[
          styles.aPill,
          {
            backgroundColor: theme.colors.surfaceSecondary,
          },
        ]}
      >
        <AnimatedPressable
          onPress={handleDec}
          disabled={quantity <= 1}
          onPressIn={() => {
            scaleL.value = withSpring(0.82, { damping: 10, stiffness: 250 });
          }}
          onPressOut={() => {
            scaleL.value = withSequence(
              withSpring(1.06, { damping: 8, stiffness: 250 }),
              withSpring(1, { damping: 14 }),
            );
          }}
          style={[
            styles.aBtn,
            leftAnim,
            {
              backgroundColor: quantity <= 1 ? 'transparent' : theme.colors.card,
              borderColor: quantity <= 1 ? theme.colors.border : theme.colors.border,
              opacity: quantity <= 1 ? 0.4 : 1,
            },
          ]}
        >
          <Minus
            size={22}
            strokeWidth={2.5}
            color={
              quantity <= 1
                ? theme.colors.textTertiary
                : theme.colors.textPrimary
            }
          />
        </AnimatedPressable>

        <View style={styles.aQtyWrap}>
          <Animated.Text
            style={[
              styles.aQty,
              qtyAnim,
              {
                color: theme.colors.textStrong,
                fontFamily: theme.font('700'),
              },
            ]}
          >
            {quantity}
          </Animated.Text>
        </View>

        <AnimatedPressable
          onPress={handleInc}
          onPressIn={() => {
            scaleR.value = withSpring(0.82, { damping: 10, stiffness: 250 });
          }}
          onPressOut={() => {
            scaleR.value = withSequence(
              withSpring(1.06, { damping: 8, stiffness: 250 }),
              withSpring(1, { damping: 14 }),
            );
          }}
          style={[
            styles.aBtn,
            rightAnim,
            {
              backgroundColor: theme.colors.primary,
              borderColor: 'transparent',
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 3,
            },
          ]}
        >
          <Plus
            size={22}
            strokeWidth={2.5}
            color={theme.colors.onPrimary}
          />
        </AnimatedPressable>
      </View>

      <FakeFooter quantity={quantity} unitPrice={18} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT B — "Glassmorphic Card"
// Blurred/frosted card with large centered quantity, elegant thin buttons.
// Quantity has a gentle glow pulse. Buttons are rounded squares.
// ─────────────────────────────────────────────────────────────────────────────
function ConceptB() {
  const theme = useTheme();
  const haptics = useHaptics();
  const [quantity, setQuantity] = useState(1);
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const scaleL = useSharedValue(1);
  const scaleR = useSharedValue(1);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [glowPulse]);

  const handleInc = useCallback(() => {
    haptics.selectionChanged();
    setDir('up');
    setQuantity((q) => q + 1);
  }, [haptics]);

  const handleDec = useCallback(() => {
    haptics.selectionChanged();
    setDir('down');
    setQuantity((q) => Math.max(1, q - 1));
  }, [haptics]);

  const leftAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scaleL.value }],
  }));
  const rightAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scaleR.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.4, 0.8]),
    transform: [{ scale: interpolate(glowPulse.value, [0, 1], [0.9, 1.1]) }],
  }));

  return (
    <View style={styles.conceptWrap}>
      {/* Card */}
      <View
        style={[
          styles.bCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: `${theme.colors.primary}20`,
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        {/* Section label inside card */}
        <Text
          style={{
            fontSize: 12,
            color: theme.colors.textSecondary,
            fontFamily: theme.font('500'),
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          כמות
        </Text>

        <View style={styles.bRow}>
          {/* Minus */}
          <AnimatedPressable
            onPress={handleDec}
            disabled={quantity <= 1}
            onPressIn={() => {
              scaleL.value = withSpring(0.85, { damping: 10, stiffness: 250 });
            }}
            onPressOut={() => {
              scaleL.value = withSequence(
                withSpring(1.05, { damping: 8 }),
                withSpring(1, { damping: 14 }),
              );
            }}
            style={[
              styles.bBtn,
              leftAnim,
              {
                backgroundColor: quantity <= 1
                  ? theme.colors.surfaceSecondary
                  : `${theme.colors.primary}12`,
                opacity: quantity <= 1 ? 0.5 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.bBtnText,
                {
                  color: quantity <= 1
                    ? theme.colors.textTertiary
                    : theme.colors.primary,
                  fontFamily: theme.font('600'),
                },
              ]}
            >
              −
            </Text>
          </AnimatedPressable>

          {/* Center quantity with glow */}
          <View style={styles.bQtyCenter}>
            {/* Glow ring */}
            <Animated.View
              style={[
                styles.bGlow,
                glowStyle,
                { backgroundColor: `${theme.colors.primary}15` },
              ]}
            />
            <View style={styles.bQtyWrap}>
              <Animated.Text
                key={`b-${quantity}`}
                entering={
                  dir === 'up'
                    ? SlideInUp.duration(180).springify().damping(14)
                    : SlideInDown.duration(180).springify().damping(14)
                }
                exiting={
                  dir === 'up'
                    ? SlideOutUp.duration(120)
                    : SlideOutDown.duration(120)
                }
                style={[
                  styles.bQty,
                  {
                    color: theme.colors.textStrong,
                    fontFamily: theme.font('700'),
                  },
                ]}
              >
                {quantity}
              </Animated.Text>
            </View>
          </View>

          {/* Plus */}
          <AnimatedPressable
            onPress={handleInc}
            onPressIn={() => {
              scaleR.value = withSpring(0.85, { damping: 10, stiffness: 250 });
            }}
            onPressOut={() => {
              scaleR.value = withSequence(
                withSpring(1.05, { damping: 8 }),
                withSpring(1, { damping: 14 }),
              );
            }}
            style={[
              styles.bBtn,
              rightAnim,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
          >
            <Text
              style={[
                styles.bBtnText,
                {
                  color: theme.colors.onPrimary,
                  fontFamily: theme.font('700'),
                },
              ]}
            >
              +
            </Text>
          </AnimatedPressable>
        </View>
      </View>

      <FakeFooter quantity={quantity} unitPrice={18} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT C — "Full-Width Warm Bar"
// Primary-colored full-bleed bar with white controls. No card wrapper.
// Feels bold and branded. Number is large and centered.
// ─────────────────────────────────────────────────────────────────────────────
function ConceptC() {
  const theme = useTheme();
  const haptics = useHaptics();
  const [quantity, setQuantity] = useState(1);
  const [dir, setDir] = useState<'up' | 'down'>('up');
  const scaleL = useSharedValue(1);
  const scaleR = useSharedValue(1);
  const qtyScale = useSharedValue(1);

  const handleInc = useCallback(() => {
    haptics.selectionChanged();
    setDir('up');
    setQuantity((q) => q + 1);
    qtyScale.value = withSequence(
      withSpring(1.25, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12 }),
    );
  }, [haptics, qtyScale]);

  const handleDec = useCallback(() => {
    haptics.selectionChanged();
    setDir('down');
    setQuantity((q) => Math.max(1, q - 1));
    qtyScale.value = withSequence(
      withSpring(0.75, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12 }),
    );
  }, [haptics, qtyScale]);

  const leftAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scaleL.value }],
  }));
  const rightAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scaleR.value }],
  }));
  const qtyAnim = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.value }],
  }));

  return (
    <View style={styles.conceptWrap}>
      {/* Full-bleed bar */}
      <View
        style={[
          styles.cBar,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        {/* Label */}
        <Text
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: theme.font('500'),
            textAlign: 'center',
            letterSpacing: 1.5,
            marginBottom: 4,
          }}
        >
          כמות
        </Text>

        <View style={styles.cRow}>
          {/* Minus */}
          <AnimatedPressable
            onPress={handleDec}
            disabled={quantity <= 1}
            onPressIn={() => {
              scaleL.value = withSpring(0.82, { damping: 10 });
            }}
            onPressOut={() => {
              scaleL.value = withSequence(
                withSpring(1.08, { damping: 8 }),
                withSpring(1, { damping: 14 }),
              );
            }}
            style={[
              styles.cBtn,
              leftAnim,
              {
                borderColor: quantity <= 1
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(255,255,255,0.4)',
                backgroundColor: quantity <= 1
                  ? 'transparent'
                  : 'rgba(255,255,255,0.12)',
                opacity: quantity <= 1 ? 0.4 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.cBtnText,
                {
                  color: theme.colors.onPrimary,
                  fontFamily: theme.font('600'),
                },
              ]}
            >
              −
            </Text>
          </AnimatedPressable>

          {/* Quantity */}
          <View style={styles.cQtyWrap}>
            <Animated.Text
              key={`c-${quantity}`}
              entering={
                dir === 'up'
                  ? SlideInUp.duration(180).springify().damping(14)
                  : SlideInDown.duration(180).springify().damping(14)
              }
              exiting={
                dir === 'up'
                  ? SlideOutUp.duration(120)
                  : SlideOutDown.duration(120)
              }
              style={[
                styles.cQty,
                qtyAnim,
                {
                  color: theme.colors.onPrimary,
                  fontFamily: theme.font('700'),
                },
              ]}
            >
              {quantity}
            </Animated.Text>
          </View>

          {/* Plus */}
          <AnimatedPressable
            onPress={handleInc}
            onPressIn={() => {
              scaleR.value = withSpring(0.82, { damping: 10 });
            }}
            onPressOut={() => {
              scaleR.value = withSequence(
                withSpring(1.08, { damping: 8 }),
                withSpring(1, { damping: 14 }),
              );
            }}
            style={[
              styles.cBtn,
              rightAnim,
              {
                borderColor: 'rgba(255,255,255,0.4)',
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
            ]}
          >
            <Text
              style={[
                styles.cBtnText,
                {
                  color: theme.colors.onPrimary,
                  fontFamily: theme.font('700'),
                },
              ]}
            >
              +
            </Text>
          </AnimatedPressable>
        </View>
      </View>

      <FakeFooter quantity={quantity} unitPrice={18} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Preview Screen
// ─────────────────────────────────────────────────────────────────────────────

const CONCEPTS = ['A: Slim Pill', 'B: Glow Card', 'C: Bold Bar'] as const;
const DESCRIPTIONS = [
  'No border card. Pill-shaped row with soft filled circles. Vertical number slide + scale bounce on change.',
  'Clean card with subtle glow ring pulsing behind the number. Rounded square buttons with brand tint.',
  'Full-width warm brown bar, white controls. Bold and branded. Number scales on each tap.',
] as const;

export function QuantityPreviewScreen() {
  const theme = useTheme();
  const { direction } = useDirection();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(0);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
            },
          ]}
        >
          Quantity Section Redesign
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.font('400'),
            },
          ]}
        >
          As it appears inside the recipe detail sheet
        </Text>
      </View>

      {/* Toggle tabs */}
      <View
        style={[
          styles.tabRow,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {CONCEPTS.map((label, idx) => {
          const isActive = active === idx;
          return (
            <Pressable
              key={label}
              onPress={() => setActive(idx)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : 'transparent',
                  borderRadius: 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary,
                    fontFamily: theme.font(isActive ? '600' : '400'),
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Description */}
      <View style={styles.descriptionBox}>
        <Text
          style={[
            styles.descriptionText,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.font('400'),
            },
          ]}
        >
          {DESCRIPTIONS[active]}
        </Text>
      </View>

      {/* Preview: simulated bottom of sheet */}
      <ScrollView
        contentContainerStyle={styles.previewArea}
        showsVerticalScrollIndicator={false}
      >
        {/* Context: fake recipe info above */}
        <View style={styles.fakeContext}>
          <Text
            style={{
              fontSize: 22,
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
            }}
          >
            קרואסון שוקולד
          </Text>
          <View
            style={[styles.accentBar, { backgroundColor: theme.colors.primary }]}
          />
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
              style={{
                fontSize: 18,
                color: theme.colors.onPrimary,
                fontFamily: theme.font('700'),
                writingDirection: 'ltr',
              }}
            >
              ₪18
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.textSecondary,
              fontFamily: theme.font('400'),
              lineHeight: 22,
            }}
          >
            קרואסון חמאה עם שוקולד בלגי מריר, אפוי טרי כל בוקר
          </Text>
        </View>

        {/* The concept being previewed */}
        {active === 0 && <ConceptA />}
        {active === 1 && <ConceptB />}
        {active === 2 && <ConceptC />}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: { paddingHorizontal: 24, paddingBottom: 16, gap: 4 },
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 13 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 13 },

  descriptionBox: { marginHorizontal: 24, marginTop: 14 },
  descriptionText: { fontSize: 13, lineHeight: 20 },

  previewArea: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
  },

  /* Fake recipe context */
  fakeContext: { gap: 12, marginBottom: 24 },
  accentBar: { width: 40, height: 4, borderRadius: 2, marginTop: -4 },
  pricePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  /* Shared concept wrapper */
  conceptWrap: { gap: 20 },

  sectionTitle: { fontSize: 15, letterSpacing: 0.2 },

  /* Footer */
  footer: {
    paddingTop: 12,
    gap: 8,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  fakeAddBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── A: Slim Pill ──
  aPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 28,
    gap: 0,
    alignSelf: 'center',
  },
  aBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  aBtnText: {
    fontSize: 22,
    lineHeight: 22,
    textAlignVertical: 'center',
    includeFontPadding: false,
    marginTop: -1,
  },
  aQtyWrap: {
    minWidth: 56,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  aQty: { fontSize: 28, textAlign: 'center' },

  // ── B: Glow Card ──
  bCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  bRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  bBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bBtnText: { fontSize: 22, lineHeight: 24 },
  bQtyCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  bQtyWrap: {
    minWidth: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bQty: { fontSize: 36, textAlign: 'center' },

  // ── C: Bold Bar ──
  cBar: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  cBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cBtnText: { fontSize: 20, lineHeight: 22 },
  cQtyWrap: {
    minWidth: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cQty: { fontSize: 34, textAlign: 'center' },
});
