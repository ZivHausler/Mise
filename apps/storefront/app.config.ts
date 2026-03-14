import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Mise Storefront',
  slug: 'mise-en-place',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'mise',
  splash: {
    backgroundColor: '#FDF8F3',
    resizeMode: 'contain',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'co.il.mise.storefront',
    associatedDomains: ['applinks:mise.co.il'],
    infoPlist: {
      CFBundleLocalizations: ['he', 'en'],
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            'mise',
            `com.googleusercontent.apps.${process.env.GOOGLE_IOS_CLIENT_ID?.split('.')[0] || ''}`,
          ],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FDF8F3',
    },
    package: 'co.il.mise.storefront',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'mise.co.il',
            pathPrefix: '/s/',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-localization',
    'expo-font',
    'expo-web-browser',
    'expo-dev-client',
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    apiBaseUrl:
      process.env.API_BASE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://mise.co.il/api/public'
        : 'http://192.168.1.137:3001/api/public'),
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || '',
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || '',
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || '',
    eas: {
      projectId: 'b34a9c40-94a5-49c4-ad1d-4a3ce2cd5589',
    },
  },
});
