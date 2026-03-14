/**
 * Navigation param types for type-safe navigation.
 */

import { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  Home: undefined;
  Menu: { slug: string };
  Cart: undefined;
  Checkout: undefined;
  Confirmation: {
    orderNumber: number;
    orderId?: number;
    totalAmount: number;
    itemCount: number;
    items: Array<{ name: string; quantity: number; price: number; photo?: string }>;
    dueDate?: string;
    paymentMethod: 'pay_at_pickup' | 'paypal';
    phone: string;
    orderDate: string;
  };
  Tracking: {
    slug: string;
    orderNumber: number;
    phone?: string;
  };
  Error: {
    type: 'storeNotFound' | 'storefrontDisabled' | 'networkError' | 'generic';
  };
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderTracking: {
    slug: string;
    orderNumber: number;
    phone: string;
    storeName: string;
  };
};

export type SettingsStackParamList = {
  Settings: undefined;
  QuantityPreview: undefined; // TODO: Remove after choosing concept
};

export type ProfileStackParamList = {
  Profile: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
  Login: undefined;
  CompleteProfile: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
