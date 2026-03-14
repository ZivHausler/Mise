import React from 'react';
import { View, Text, StyleSheet, I18nManager } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Home, ClipboardList, Settings, User } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, StoreThemeProvider } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useOrderJournalStore } from '../stores/orderJournalStore';
import { useCustomerOrders } from '../api/hooks';
import { slideFromEnd, fadeIn, confirmationTransition } from './transitions';
import type {
  HomeStackParamList,
  OrdersStackParamList,
  ProfileStackParamList,
  SettingsStackParamList,
  TabParamList,
} from './types';

import { HomeScreen } from '../screens/HomeScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { ConfirmationScreen } from '../screens/ConfirmationScreen';
import { TrackingScreen } from '../screens/TrackingScreen';
import { ErrorScreen } from '../screens/ErrorScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { QuantityPreviewScreen } from '../screens/QuantityPreview';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const OrdersStackNav = createNativeStackNavigator<OrdersStackParamList>();
const SettingsStackNav = createNativeStackNavigator<SettingsStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

// Screens where the tab bar should be hidden
const HIDDEN_TAB_BAR_SCREENS = ['Cart', 'Checkout', 'Confirmation', 'Tracking', 'Error'];

/**
 * Thin wrapper that receives OrdersStackParamList['OrderTracking'] props
 * and renders TrackingScreen with the compatible param subset (slug, orderNumber, phone).
 */
function OrderTrackingScreen({
  route,
  navigation,
}: NativeStackScreenProps<OrdersStackParamList, 'OrderTracking'>) {
  const { slug, orderNumber, phone } = route.params;
  // Build a route-like object matching HomeStackParamList['Tracking'] shape
  const trackingRoute = {
    ...route,
    params: { slug, orderNumber, phone },
  } as unknown as NativeStackScreenProps<HomeStackParamList, 'Tracking'>['route'];

  return (
    <TrackingScreen
      route={trackingRoute}
      navigation={navigation as unknown as NativeStackScreenProps<HomeStackParamList, 'Tracking'>['navigation']}
    />
  );
}

// Wrap store-specific screens so they pick up the store owner's chosen theme
function ThemedMenuScreen(props: any) {
  return <StoreThemeProvider><MenuScreen {...props} /></StoreThemeProvider>;
}
function ThemedCartScreen(props: any) {
  return <StoreThemeProvider><CartScreen {...props} /></StoreThemeProvider>;
}

function HomeStack() {
  const { direction } = useDirection();
  return (
    <HomeStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { direction },
        ...slideFromEnd,
      }}
    >
      <HomeStackNav.Screen name="Home" component={HomeScreen} options={fadeIn} />
      <HomeStackNav.Screen name="Menu" component={ThemedMenuScreen} options={slideFromEnd} />
      <HomeStackNav.Screen name="Cart" component={ThemedCartScreen} options={slideFromEnd} />
      <HomeStackNav.Screen name="Checkout" component={CheckoutScreen} options={slideFromEnd} />
      <HomeStackNav.Screen name="Confirmation" component={ConfirmationScreen} options={confirmationTransition} />
      <HomeStackNav.Screen name="Tracking" component={TrackingScreen} options={slideFromEnd} />
      <HomeStackNav.Screen name="Error" component={ErrorScreen} options={fadeIn} />
    </HomeStackNav.Navigator>
  );
}

function OrdersStack() {
  const { direction } = useDirection();
  return (
    <OrdersStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { direction },
        ...slideFromEnd,
      }}
    >
      <OrdersStackNav.Screen name="OrdersList" component={OrdersScreen} options={fadeIn} />
      <OrdersStackNav.Screen name="OrderTracking" component={OrderTrackingScreen} options={slideFromEnd} />
    </OrdersStackNav.Navigator>
  );
}

function SettingsStack() {
  const { direction } = useDirection();
  return (
    <SettingsStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { direction },
      }}
    >
      <SettingsStackNav.Screen name="Settings" component={SettingsScreen} options={fadeIn} />
      <SettingsStackNav.Screen name="QuantityPreview" component={QuantityPreviewScreen} options={slideFromEnd} />
    </SettingsStackNav.Navigator>
  );
}

function ProfileStack() {
  const { direction } = useDirection();
  return (
    <ProfileStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { direction },
      }}
    >
      <ProfileStackNav.Screen name="Profile" component={ProfileScreen} options={fadeIn} />
    </ProfileStackNav.Navigator>
  );
}

function OrdersBadge() {
  const { data: orders } = useCustomerOrders();
  const journalOrders = useOrderJournalStore((s) => s.orders);
  const theme = useTheme();
  // Count active orders: PENDING_APPROVAL(0), RECEIVED(1), IN_PROGRESS(2), READY(3), CANCELLATION_REQUESTED(6)
  // Exclude DELIVERED(4) and CANCELLED(5)
  // Active: PENDING_APPROVAL(0) through READY(3)
  const count = orders
    ? orders.filter((o) => o.status !== undefined && ((o.status >= 0 && o.status <= 3) || o.status === 6)).length
    : journalOrders.length;

  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (count > 0) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withSpring(1, { damping: 10 }),
      );
    }
  }, [count]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (count === 0) return null;

  return (
    <Animated.View
      style={[
        styles.badge,
        { backgroundColor: theme.colors.primary, borderColor: theme.colors.card },
        animatedStyle,
      ]}
    >
      <Text style={[styles.badgeText, { color: theme.colors.onPrimary }]}>
        {count > 9 ? '9+' : count}
      </Text>
    </Animated.View>
  );
}

export function TabNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const insets = useSafeAreaInsets();

  const TAB_BAR_STYLE = {
    height: 68,
    paddingBottom: 8,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  } as const;

  return (
    <Tab.Navigator
      sceneContainerStyle={{ direction }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: theme.font('600'),
          marginTop: -2,
        },
        tabBarStyle: TAB_BAR_STYLE,
        tabBarItemStyle: {
          paddingTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
          return {
            tabBarLabel: t('tabs.home'),
            tabBarIcon: ({ color }) => <Home size={26} color={color} strokeWidth={2} />,
            tabBarStyle: HIDDEN_TAB_BAR_SCREENS.includes(routeName)
              ? { display: 'none' as const }
              : TAB_BAR_STYLE,
          };
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Pop to top when re-tapping the Home tab
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'Home';
            if (routeName === 'Home') return;
            e.preventDefault();
            navigation.navigate('HomeTab', { screen: 'Home' });
          },
        })}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          tabBarLabel: t('tabs.orders'),
          tabBarIcon: ({ color }) => (
            <View>
              <ClipboardList size={26} color={color} strokeWidth={2} />
              <OrdersBadge />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <User size={26} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color }) => (
            <Settings size={26} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    end: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
