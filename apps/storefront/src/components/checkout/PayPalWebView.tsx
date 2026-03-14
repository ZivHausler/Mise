import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';

interface PayPalWebViewProps {
  approvalUrl: string;
  onApproved: (data: { paypalOrderId: string }) => void;
  onCancelled: () => void;
  onError: (error: string) => void;
}

export function PayPalWebView({
  approvalUrl,
  onApproved,
  onCancelled,
  onError,
}: PayPalWebViewProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const handledRef = useRef(false);

  const handleNavigationChange = useCallback(
    (navState: WebViewNavigation) => {
      if (handledRef.current) return;
      const url = navState.url;

      // PayPal redirects to return_url after approval
      if (url.includes('mise.co.il/payment/return')) {
        handledRef.current = true;
        // Extract the token (PayPal order ID) from the URL
        const params = new URLSearchParams(url.split('?')[1] ?? '');
        const token = params.get('token');
        if (token) {
          onApproved({ paypalOrderId: token });
        } else {
          onError('Missing payment token');
        }
        return false;
      }

      // PayPal redirects to cancel_url if customer cancels
      if (url.includes('mise.co.il/payment/cancel')) {
        handledRef.current = true;
        onCancelled();
        return false;
      }
    },
    [onApproved, onCancelled, onError],
  );

  const handleShouldStartLoad = useCallback(
    (event: { url: string }) => {
      if (handledRef.current) return false;

      if (event.url.includes('mise.co.il/payment/return')) {
        handledRef.current = true;
        const params = new URLSearchParams(event.url.split('?')[1] ?? '');
        const token = params.get('token');
        if (token) {
          onApproved({ paypalOrderId: token });
        } else {
          onError('Missing payment token');
        }
        return false;
      }

      if (event.url.includes('mise.co.il/payment/cancel')) {
        handledRef.current = true;
        onCancelled();
        return false;
      }

      return true;
    },
    [onApproved, onCancelled, onError],
  );

  return (
    <View style={[styles.container, { backgroundColor: '#FDF8F3' }]}>
      {isLoading && (
        <View style={[styles.loadingContainer, { backgroundColor: '#FDF8F3' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary, fontFamily: theme.font('400') }]}>
            {t('error.loadingPayment')}
          </Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: approvalUrl }}
        onNavigationStateChange={handleNavigationChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => onError('Failed to load payment page')}
        style={[styles.webView, isLoading && { opacity: 0 }]}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit={false}
        originWhitelist={['https://*', 'http://*']}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 1,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
});
