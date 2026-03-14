import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import type { RootStackParamList } from './types';
import { fadeIn } from './transitions';
import { useAuthStore } from '../stores/authStore';
import { useDirection } from '../contexts/DirectionContext';
import { LoginScreen } from '../screens/LoginScreen';
import { CompleteProfileScreen } from '../screens/CompleteProfileScreen';
import { TabNavigator } from './TabNavigator';
import type { LinkingOptions } from '@react-navigation/native';

const Stack = createNativeStackNavigator<RootStackParamList>();

// React Navigation's LinkingOptions generic expects the config shape to exactly mirror
// the navigator param list hierarchy, but nested navigators with NavigatorScreenParams
// cause a type mismatch since the linking config uses a plain `screens` object.
// This is a known limitation: https://github.com/react-navigation/react-navigation/issues/10876
// TODO: Revisit when @react-navigation v7 ships improved linking types.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'https://mise.co.il',
    'mise://',
  ],
  config: {
    screens: {
      MainTabs: {
        screens: {
          HomeTab: {
            screens: {
              Menu: 's/:slug',
              Tracking: 's/:slug/track/:orderNumber',
            },
          },
        },
      },
      CompleteProfile: 'complete-profile',
      Login: 'login',
    },
  } as LinkingOptions<RootStackParamList>['config'],
};

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isProfileComplete = useAuthStore((s) => s.user?.isProfileComplete ?? false);
  const isGuest = useAuthStore((s) => s.user?.provider === 'guest');
  const { direction } = useDirection();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { direction },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={fadeIn}
          />
        ) : !isProfileComplete && !isGuest ? (
          <Stack.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
            options={fadeIn}
          />
        ) : (
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={fadeIn}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
