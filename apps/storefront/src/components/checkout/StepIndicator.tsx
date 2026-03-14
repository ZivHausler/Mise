import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

function ActiveDotGlow({ color }: { color: string }) {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color,
        },
        glowStyle,
      ]}
    />
  );
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const theme = useTheme();
  const { direction } = useDirection();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <View style={styles.stepsRow}>
        {steps.map((label, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;

          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <View style={styles.lineContainer}>
                  <View
                    style={[
                      styles.lineBackground,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <View
                    style={[
                      styles.lineFill,
                      {
                        backgroundColor: theme.colors.primary,
                        width: isDone || isActive ? '100%' : '0%',
                      },
                    ]}
                  />
                </View>
              )}
              <View style={styles.stepItem}>
                <View style={styles.dotWrapper}>
                  {isActive && <ActiveDotGlow color={theme.colors.primary} />}
                  <View
                    style={[
                      styles.dot,
                      isActive && {
                        backgroundColor: theme.colors.primary,
                        shadowColor: theme.colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        elevation: 4,
                      },
                      isDone && {
                        backgroundColor: theme.colors.primary,
                      },
                      !isActive && !isDone && {
                        backgroundColor: theme.colors.surfaceSecondary,
                        borderWidth: 2,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    {isDone ? (
                      <Text style={[styles.check, { color: theme.colors.onPrimary }]}>{'\u2713'}</Text>
                    ) : (
                      <Text
                        style={[
                          styles.dotNumber,
                          {
                            color: isActive
                              ? theme.colors.onPrimary
                              : theme.colors.textTertiary,
                            fontFamily: theme.font('600'),
                          },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.label,
                    {
                      color: isActive
                        ? theme.colors.primary
                        : isDone
                          ? theme.colors.textPrimary
                          : theme.colors.textTertiary,
                      fontFamily: theme.font(isActive ? '600' : '400'),
                      writingDirection: direction,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    gap: 8,
    width: 72,
  },
  dotWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotNumber: {
    fontSize: 13,
    fontWeight: '600',
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
  },
  lineContainer: {
    flex: 1,
    height: 3,
    marginTop: 19,
    marginHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  lineBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 2,
  },
  lineFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
});
