/**
 * Custom screen transition configurations.
 */

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const slideFromEnd: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  animationDuration: 300,
};

export const fadeIn: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 300,
};

export const confirmationTransition: NativeStackNavigationOptions = {
  animation: 'fade_from_bottom',
  animationDuration: 400,
  gestureEnabled: false, // Disable back gesture on confirmation
};
