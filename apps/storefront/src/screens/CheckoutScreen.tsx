import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useCartStore, useStoreStore, useOrderJournalStore } from '../stores';
import { useAuthStore } from '../stores/authStore';
import { useCreateOrder, useCreatePayPalOrder } from '../api/hooks';
import { useHaptics } from '../hooks/useHaptics';
import type { HomeStackParamList } from '../navigation/types';

import { StepIndicator } from '../components/checkout/StepIndicator';
import { CustomerForm } from '../components/checkout/CustomerForm';
import { PickupPicker } from '../components/checkout/PickupPicker';
import { PaymentSelector } from '../components/checkout/PaymentSelector';
import { IconButton } from '../components/ui/IconButton';
import { PayPalWebView } from '../components/checkout/PayPalWebView';
import { ChevronRight } from 'lucide-react-native';

type Props = NativeStackScreenProps<HomeStackParamList, 'Checkout'>;

interface CustomerData {
  name: string;
  phone: string;
  email: string;
}

export function CheckoutScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRTL, direction } = useDirection();
  const haptics = useHaptics();
  const slug = useStoreStore((s) => s.slug);
  const setStatusBarMode = useStoreStore((s) => s.setStatusBarMode);

  useFocusEffect(
    useCallback(() => {
      setStatusBarMode('default');
    }, []),
  );
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clear);

  const storeInfo = useStoreStore((s) => s.storeInfo);
  const addOrderToJournal = useOrderJournalStore((s) => s.addOrder);
  const authUser = useAuthStore((s) => s.user);

  const createOrderMutation = useCreateOrder(slug);
  const createPayPalOrderMutation = useCreatePayPalOrder(slug);

  const [step, setStep] = useState(0);

  // Step 1: Customer details — pre-fill from auth profile
  const [customer, setCustomer] = useState<CustomerData>({
    name: [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' '),
    phone: authUser?.phone ?? '',
    email: authUser?.email ?? '',
  });
  const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerData, string>>>({});

  // Step 2: Pickup
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_pickup' | 'paypal'>('pay_at_pickup');

  // PayPal WebView state
  const [showPayPalWebView, setShowPayPalWebView] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);

  const stepLabels = [
    t('checkout.stepDetails'),
    t('checkout.stepPickup'),
    t('checkout.stepPayment'),
  ];

  const validateCustomer = useCallback((): boolean => {
    const errors: Partial<Record<keyof CustomerData, string>> = {};
    if (!customer.name.trim()) {
      errors.name = t('checkout.nameRequired');
    }
    if (!customer.phone.trim()) {
      errors.phone = t('checkout.phoneRequired');
    } else if (!/^\+?[0-9]{9,15}$/.test(customer.phone.replace(/[-\s]/g, ''))) {
      errors.phone = t('checkout.phoneInvalid');
    }
    setCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  }, [customer, t]);

  const handleNextFromCustomer = useCallback(() => {
    if (validateCustomer()) {
      setStep(1);
    }
  }, [validateCustomer]);

  const handleNextFromPickup = useCallback(() => {
    setStep(2);
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    const phone = customer.phone.replace(/[-\s]/g, '');
    const dueDate = selectedDate && selectedTime
      ? new Date(`${selectedDate}T${selectedTime}:00`).toISOString()
      : undefined;

    try {
      if (paymentMethod === 'paypal') {
        // Step 1: Create PayPal order only (no DB order yet)
        const paypalResult = await createPayPalOrderMutation.mutateAsync({
          items: items.map((i) => ({ recipeId: i.recipeId, quantity: i.quantity })),
        });
        // Step 2: Show PayPal approval UI
        setApprovalUrl(paypalResult.approvalUrl);
        setShowPayPalWebView(true);
      } else {
        // pay_at_pickup — create order directly
        const result = await createOrderMutation.mutateAsync({
          customer: {
            name: customer.name.trim(),
            phone,
            email: customer.email.trim() || undefined,
          },
          items: items.map((i) => ({
            recipeId: i.recipeId,
            quantity: i.quantity,
            notes: i.notes,
          })),
          notes: orderNotes || undefined,
          dueDate,
          paymentMethod,
        });

        haptics.notificationSuccess();
        clearCart();

        addOrderToJournal({
          slug,
          storeName: storeInfo?.name ?? '',
          orderNumber: result.orderNumber,
          phone,
          totalAmount: result.totalAmount,
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          createdAt: new Date().toISOString(),
        });

        navigation.replace('Confirmation', {
          orderNumber: result.orderNumber,
          totalAmount: result.totalAmount,
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, photo: i.photo })),
          dueDate: dueDate,
          paymentMethod,
          phone,
          orderDate: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      haptics.notificationError();
      Alert.alert(
        t('error.genericError'),
        error.message ?? t('error.genericErrorMessage'),
      );
    }
  }, [customer, items, selectedDate, selectedTime, orderNotes, paymentMethod, slug, subtotal, haptics, clearCart, navigation, t, createOrderMutation, createPayPalOrderMutation]);

  const handlePayPalApproved = useCallback(async (data: { paypalOrderId: string }) => {
    setShowPayPalWebView(false);
    setApprovalUrl(null);
    const phone = customer.phone.replace(/[-\s]/g, '');
    const dueDate = selectedDate && selectedTime
      ? new Date(`${selectedDate}T${selectedTime}:00`).toISOString()
      : undefined;

    try {
      // Step 3: Create the DB order with the approved PayPal order ID
      // Backend will capture payment + create order atomically
      const result = await createOrderMutation.mutateAsync({
        customer: {
          name: customer.name.trim(),
          phone,
          email: customer.email.trim() || undefined,
        },
        items: items.map((i) => ({
          recipeId: i.recipeId,
          quantity: i.quantity,
          notes: i.notes,
        })),
        notes: orderNotes || undefined,
        dueDate,
        paymentMethod: 'paypal',
        paypalOrderId: data.paypalOrderId,
      });

      haptics.notificationSuccess();
      clearCart();

      addOrderToJournal({
        slug,
        storeName: storeInfo?.name ?? '',
        orderNumber: result.orderNumber,
        phone,
        totalAmount: result.totalAmount,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        createdAt: new Date().toISOString(),
      });

      navigation.replace('Confirmation', {
        orderNumber: result.orderNumber,
        totalAmount: result.totalAmount,
        itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, photo: i.photo })),
        dueDate,
        paymentMethod: 'paypal',
        phone,
        orderDate: new Date().toISOString(),
      });
    } catch (error: any) {
      haptics.notificationError();
      Alert.alert(
        t('error.genericError'),
        error.message ?? t('error.genericErrorMessage'),
      );
    }
  }, [createOrderMutation, customer, selectedDate, selectedTime, orderNotes, items, haptics, clearCart, navigation, slug, storeInfo, t]);

  const handlePayPalCancelled = useCallback(() => {
    setShowPayPalWebView(false);
    setApprovalUrl(null);
  }, []);

  const handlePayPalError = useCallback((errorMsg: string) => {
    setShowPayPalWebView(false);
    setApprovalUrl(null);
    haptics.notificationError();
    Alert.alert(t('error.genericError'), errorMsg);
  }, [haptics, t]);

  const isPlacing = createOrderMutation.isPending || createPayPalOrderMutation.isPending;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.surface }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <IconButton
          icon={
            <View style={{ transform: [{ scaleX: isRTL ? 1 : -1 }] }}>
              <ChevronRight size={24} color={theme.colors.textPrimary} strokeWidth={2} />
            </View>
          }
          onPress={() => {
            if (step > 0) {
              setStep(step - 1);
            } else {
              navigation.goBack();
            }
          }}
          accessibilityLabel={t('common.back')}
        />
        <Text
          style={[
            styles.headerTitle,
            {
              color: theme.colors.textStrong,
              fontFamily: theme.font('700'),
              writingDirection: direction,
            },
          ]}
        >
          {t('checkout.title')}
        </Text>
        {/* Order total in header */}
        <View
          style={[
            styles.headerPrice,
            { backgroundColor: `${theme.colors.primary}12` },
          ]}
        >
          <Text
            style={[
              styles.headerPriceText,
              {
                color: theme.colors.primary,
                fontFamily: theme.font('600'),
                writingDirection: 'ltr',
              },
            ]}
          >
            {subtotal.toFixed(0)} {'\u20AA'}
          </Text>
        </View>
      </View>

      {/* Step Indicator */}
      <StepIndicator steps={stepLabels} currentStep={step} />

      {/* Step Content */}
      {step === 0 && (
        <Animated.View style={styles.stepContainer} entering={FadeIn.duration(250)}>
          <CustomerForm
            data={customer}
            onChange={setCustomer}
            onNext={handleNextFromCustomer}
            errors={customerErrors}
          />
        </Animated.View>
      )}
      {step === 1 && (
        <Animated.View style={styles.stepContainer} entering={FadeIn.duration(250)}>
          <PickupPicker
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            orderNotes={orderNotes}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            onNotesChange={setOrderNotes}
            onNext={handleNextFromPickup}
          />
        </Animated.View>
      )}
      {step === 2 && (
        <Animated.View style={styles.stepContainer} entering={FadeIn.duration(250)}>
          <PaymentSelector
            selected={paymentMethod}
            onSelect={setPaymentMethod}
            onPlaceOrder={handlePlaceOrder}
            loading={isPlacing}
            itemCount={items.reduce((sum, i) => sum + i.quantity, 0)}
            total={subtotal}
            items={items}
            dueDate={selectedDate}
            dueTime={selectedTime}
          />
        </Animated.View>
      )}

      {/* Payment WebView Modal */}
      <Modal
        visible={showPayPalWebView}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handlePayPalCancelled}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FDF8F3' }}>
          <View style={[styles.paymentModalHeader, { borderBottomColor: `${theme.colors.primary}15` }]}>
            <IconButton
              icon={<Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>{'\u2715'}</Text>}
              onPress={handlePayPalCancelled}
              accessibilityLabel={t('common.close')}
            />
            <View style={styles.paymentModalTitleWrap}>
              <Text style={[styles.paymentModalTitle, { color: theme.colors.textStrong, fontFamily: theme.font('600') }]}>
                {t('checkout.stepPayment')}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
          {approvalUrl && (
            <PayPalWebView
              approvalUrl={approvalUrl}
              onApproved={handlePayPalApproved}
              onCancelled={handlePayPalCancelled}
              onError={handlePayPalError}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerPrice: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerPriceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepContainer: {
    flex: 1,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  paymentModalTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  paymentModalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});
