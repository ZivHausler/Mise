import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, interpolate, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react-native';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface PickupPickerProps {
  selectedDate: string;
  selectedTime: string;
  orderNotes: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onNotesChange: (notes: string) => void;
  onNext: () => void;
}

const HOUR_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const h = i + 7; // 7:00 – 20:00
  return `${h.toString().padStart(2, '0')}:00`;
});

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function formatHourLabel(slot: string) {
  const hour = parseInt(slot);
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateValue(year: number, month: number, day: number) {
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function TimeWheelPicker({ selectedTime, onTimeChange }: { selectedTime: string; onTimeChange: (t: string) => void }) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const initialIndex = selectedTime ? HOUR_SLOTS.indexOf(selectedTime) : -1;
  const [activeIndex, setActiveIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const didMount = useRef(false);

  // Scroll to initial selection on mount
  useEffect(() => {
    if (!didMount.current && initialIndex >= 0) {
      didMount.current = true;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: initialIndex * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [initialIndex]);

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, HOUR_SLOTS.length - 1));
    setActiveIndex(clamped);
    onTimeChange(HOUR_SLOTS[clamped]!);
  }, [onTimeChange]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, HOUR_SLOTS.length - 1));
    // Snap to nearest item
    scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
  }, []);

  // Padding so first/last items can be centered
  const padCount = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <View
      style={[
        styles.wheelContainer,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Selection highlight */}
      <View
        style={[
          styles.wheelHighlight,
          {
            backgroundColor: `${theme.colors.primary}12`,
            borderColor: `${theme.colors.primary}30`,
            top: padCount * ITEM_HEIGHT,
          },
        ]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{
          paddingVertical: padCount * ITEM_HEIGHT,
        }}
        style={{ height: WHEEL_HEIGHT }}
      >
        {HOUR_SLOTS.map((slot, i) => {
          const isActive = i === activeIndex;
          return (
            <Pressable
              key={slot}
              onPress={() => {
                setActiveIndex(i);
                onTimeChange(slot);
                scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              }}
              style={styles.wheelItem}
            >
              <Clock
                size={16}
                color={isActive ? theme.colors.primary : 'transparent'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.wheelItemText,
                  {
                    color: isActive
                      ? theme.colors.primary
                      : theme.colors.textTertiary,
                    fontFamily: theme.font(isActive ? '700' : '400'),
                    fontSize: isActive ? 18 : 15,
                    writingDirection: 'ltr',
                  },
                ]}
              >
                {formatHourLabel(slot)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Top/bottom fade gradients — visually hint at scrollability */}
      <View style={[styles.wheelFadeTop, { backgroundColor: theme.colors.card }]} pointerEvents="none" />
      <View style={[styles.wheelFadeBottom, { backgroundColor: theme.colors.card }]} pointerEvents="none" />
    </View>
  );
}

export function PickupPicker({
  selectedDate,
  selectedTime,
  orderNotes,
  onDateChange,
  onTimeChange,
  onNotesChange,
  onNext,
}: PickupPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const today = useMemo(() => new Date(), []);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Calendar state
  const [calYear, setCalYear] = useState(() =>
    selectedDate ? parseInt(selectedDate.split('-')[0]!) : today.getFullYear(),
  );
  const [calMonth, setCalMonth] = useState(() =>
    selectedDate ? parseInt(selectedDate.split('-')[1]!) - 1 : today.getMonth(),
  );

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate + 'T00:00:00');
    const todayStr = formatDateValue(today.getFullYear(), today.getMonth(), today.getDate());
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    const tomorrowStr = formatDateValue(tom.getFullYear(), tom.getMonth(), tom.getDate());

    if (selectedDate === todayStr) return t('checkout.today');
    if (selectedDate === tomorrowStr) return t('checkout.tomorrow');

    return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [selectedDate, today, t]);

  const goToPrevMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const canGoPrev = calYear > today.getFullYear() || calMonth > today.getMonth() || calYear > today.getFullYear();

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
    const todayStr = formatDateValue(today.getFullYear(), today.getMonth(), today.getDate());

    const cells: { day: number; value: string; disabled: boolean }[] = [];
    // Empty cells for days before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: 0, value: '', disabled: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const value = formatDateValue(calYear, calMonth, d);
      cells.push({ day: d, value, disabled: value < todayStr });
    }
    return cells;
  }, [calYear, calMonth, today]);

  const weekDayLabels = useMemo(() => {
    // Sun–Sat short labels in Hebrew
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i); // Jan 2024 starts on Monday, but we use index trick
      // Create a date that falls on the right weekday: Jan 7 2024 = Sunday
      const ref = new Date(2024, 0, 7 + i);
      return ref.toLocaleDateString('he-IL', { weekday: 'narrow' });
    });
  }, []);

  const monthYearLabel = useMemo(() => {
    const d = new Date(calYear, calMonth, 1);
    return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  }, [calYear, calMonth]);

  const handleSelectDate = useCallback((value: string) => {
    onDateChange(value);
    setShowDatePicker(false);
  }, [onDateChange]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentInset={{ bottom: 40 }}
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIconCircle,
              { backgroundColor: `${theme.colors.primary}12` },
            ]}
          >
            <Text style={styles.sectionIcon}>{'\u{1F4C5}'}</Text>
          </View>
          <View style={styles.sectionTextContainer}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textStrong,
                  fontFamily: theme.font('600'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.stepPickup')}
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: theme.colors.textTertiary,
                  fontFamily: theme.font('400'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.pickupSubtitle')}
            </Text>
          </View>
        </View>

        {/* Date Picker */}
        <Text
          style={[
            styles.sectionLabel,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.font('600'),
              writingDirection: direction,
            },
          ]}
        >
          {t('checkout.pickupDate')}
        </Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={({ pressed }) => [
            styles.pickerButton,
            {
              backgroundColor: pressed ? theme.colors.surfaceSecondary : theme.colors.card,
              borderColor: selectedDate ? theme.colors.primary : theme.colors.border,
              borderWidth: selectedDate ? 1.5 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.pickerButtonText,
              {
                color: selectedDate ? theme.colors.textStrong : theme.colors.textTertiary,
                fontFamily: theme.font(selectedDate ? '500' : '400'),
                writingDirection: direction,
              },
            ]}
          >
            {selectedDateLabel ?? t('checkout.selectDate')}
          </Text>
          <Calendar size={20} color={selectedDate ? theme.colors.primary : theme.colors.textTertiary} />
        </Pressable>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable
              style={[
                styles.calendarCard,
                {
                  backgroundColor: theme.colors.card,
                  shadowColor: '#000',
                },
              ]}
              onPress={() => {}} // prevent close on inner tap
            >
              {/* Month navigation */}
              <View style={styles.calendarNav}>
                <Pressable
                  onPress={goToPrevMonth}
                  disabled={!canGoPrev}
                  hitSlop={8}
                  style={[styles.calendarNavBtn, !canGoPrev && { opacity: 0.3 }]}
                >
                  <ChevronRight size={22} color={theme.colors.textPrimary} />
                </Pressable>
                <Text
                  style={[
                    styles.calendarMonthLabel,
                    {
                      color: theme.colors.textStrong,
                      fontFamily: theme.font('600'),
                      writingDirection: direction,
                    },
                  ]}
                >
                  {monthYearLabel}
                </Text>
                <Pressable onPress={goToNextMonth} hitSlop={8} style={styles.calendarNavBtn}>
                  <ChevronLeft size={22} color={theme.colors.textPrimary} />
                </Pressable>
              </View>

              {/* Weekday headers */}
              <View style={styles.calendarWeekRow}>
                {weekDayLabels.map((label, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.calendarWeekDay,
                      {
                        color: theme.colors.textTertiary,
                        fontFamily: theme.font('500'),
                      },
                    ]}
                  >
                    {label}
                  </Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((cell, i) => {
                  if (cell.day === 0) {
                    return <View key={`empty-${i}`} style={styles.calendarDayCell} />;
                  }
                  const isSelected = cell.value === selectedDate;
                  const isToday = cell.value === formatDateValue(today.getFullYear(), today.getMonth(), today.getDate());
                  return (
                    <Pressable
                      key={cell.value}
                      onPress={() => !cell.disabled && handleSelectDate(cell.value)}
                      disabled={cell.disabled}
                      style={[
                        styles.calendarDayCell,
                        isSelected && [styles.calendarDaySelected, { backgroundColor: theme.colors.primary }],
                        isToday && !isSelected && [styles.calendarDayToday, { borderColor: theme.colors.primary }],
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          {
                            color: cell.disabled
                              ? theme.colors.textTertiary
                              : isSelected
                                ? theme.colors.onPrimary
                                : theme.colors.textPrimary,
                            fontFamily: theme.font(isSelected || isToday ? '600' : '400'),
                          },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Time Picker — Scroll Wheel */}
        <Text
          style={[
            styles.sectionLabel,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.font('600'),
              marginTop: 24,
              writingDirection: direction,
            },
          ]}
        >
          {t('checkout.pickupTime')}
        </Text>
        <TimeWheelPicker
          selectedTime={selectedTime}
          onTimeChange={onTimeChange}
        />

        {/* Order notes */}
        <View style={{ marginTop: 24 }}>
          <Input
            label={t('checkout.orderNotes')}
            value={orderNotes}
            onChangeText={onNotesChange}
            placeholder={t('checkout.orderNotesPlaceholder')}
            multiline
            style={{ minHeight: 80 }}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.buttonContainer,
          {
            backgroundColor: theme.colors.card,
            shadowColor: '#000',
          },
        ]}
      >
        <Button
          title={t('checkout.continue')}
          onPress={onNext}
          variant="primary"
          size="large"
          disabled={!selectedDate || !selectedTime}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTextContainer: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  // Date picker button
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  pickerButtonText: {
    fontSize: 15,
    flex: 1,
  },
  // Calendar modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarNavBtn: {
    padding: 4,
  },
  calendarMonthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  calendarDaySelected: {
    borderRadius: 100,
  },
  calendarDayToday: {
    borderWidth: 1.5,
    borderRadius: 100,
  },
  calendarDayText: {
    fontSize: 15,
  },
  // Time wheel
  wheelContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  wheelHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wheelItemText: {
    fontWeight: '500',
    minWidth: 70,
    textAlign: 'center',
  },
  wheelFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    opacity: 0.7,
    pointerEvents: 'none',
  },
  wheelFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    opacity: 0.7,
    pointerEvents: 'none',
  },
  buttonContainer: {
    padding: 20,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
});
