/**
 * Haptic feedback hook with safe platform check.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  return {
    impactLight: () => {
      if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    impactMedium: () => {
      if (isSupported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    selectionChanged: () => {
      if (isSupported) Haptics.selectionAsync();
    },
    notificationSuccess: () => {
      if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    notificationWarning: () => {
      if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    notificationError: () => {
      if (isSupported) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  };
}
