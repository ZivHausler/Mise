import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '../theme';
import { useDirection } from '../contexts/DirectionContext';
import { useAuthStore } from '../stores/authStore';
import { updateStorefrontProfile } from '../api/hooks';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'CompleteProfile'>;

export function CompleteProfileScreen(_props: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  // Determine which fields are missing (phone only — name is always editable)
  const missingFields = useMemo(() => {
    const fields: Array<'firstName' | 'lastName' | 'phone'> = [];
    if (!user?.firstName?.trim()) fields.push('firstName');
    if (!user?.lastName?.trim()) fields.push('lastName');
    if (!user?.phone?.trim()) fields.push('phone');
    return fields;
  }, [user?.firstName, user?.lastName, user?.phone]);

  // Always show name fields so users can override Google-provided values
  const visibleFields = useMemo(() => {
    const fields = new Set(missingFields);
    fields.add('firstName');
    fields.add('lastName');
    return fields;
  }, [missingFields]);

  // Form state — initialize from auth store (empty string for missing fields)
  const [firstName, setFirstName] = useState(user?.firstName?.trim() || '');
  const [lastName, setLastName] = useState(user?.lastName?.trim() || '');
  const [phone, setPhone] = useState(user?.phone?.trim() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const validatePhone = useCallback(
    (value: string): boolean => {
      const digits = value.replace(/[-\s]/g, '');
      return /^0?[57]\d{8}$/.test(digits);
    },
    [],
  );

  const isFormValid = useMemo(() => {
    if (!firstName.trim()) return false;
    if (!lastName.trim()) return false;
    if (visibleFields.has('phone') && !phone.trim()) return false;
    if (visibleFields.has('phone') && phone.trim() && !validatePhone(phone)) {
      return false;
    }
    return true;
  }, [visibleFields, firstName, lastName, phone, validatePhone]);

  const handleSubmit = useCallback(async () => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) {
      newErrors.firstName = t('completeProfile.errors.required');
    }
    if (!lastName.trim()) {
      newErrors.lastName = t('completeProfile.errors.required');
    }
    if (visibleFields.has('phone')) {
      if (!phone.trim()) {
        newErrors.phone = t('completeProfile.errors.required');
      } else if (!validatePhone(phone)) {
        newErrors.phone = t('completeProfile.errors.invalidPhone');
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const payload: { firstName?: string; lastName?: string; phone?: string } = {};
      // Always send name fields so user can override Google-provided values
      payload.firstName = firstName.trim();
      payload.lastName = lastName.trim();
      if (visibleFields.has('phone')) {
        // Send raw phone — backend handles normalization
        payload.phone = phone.replace(/[-\s]/g, '');
      }

      const result = await updateStorefrontProfile(payload);

      // Update local auth store with server-normalized values — navigator will auto-route to MainTabs
      updateProfile({
        firstName: result.customer.firstName || user?.firstName || '',
        lastName: result.customer.lastName || user?.lastName || '',
        phone: result.customer.phone || user?.phone || '',
      });
    } catch (err: any) {
      // Show generic error or field-specific errors from backend
      if (err?.message) {
        setErrors({ _form: err.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [visibleFields, firstName, lastName, phone, validatePhone, updateProfile, user, t]);

  // Pre-compute sequential animation delays for rendered fields
  const fieldDelays = useMemo(() => {
    let delay = 550;
    const delays: Record<string, number> = {};
    for (const field of ['firstName', 'lastName', 'phone'] as const) {
      if (visibleFields.has(field)) {
        delays[field] = delay;
        delay += 50;
      }
    }
    delays.emailRow = delay;
    return delays;
  }, [visibleFields]);

  return (
    <View style={styles.container}>


      {/* Top zone — dark background */}
      <View style={[styles.topSection, { backgroundColor: '#1A1A16' }]}>
        {/* Decorative circles */}
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle1,
            { backgroundColor: theme.colors.primary, opacity: 0.08 },
          ]}
        />
        <View
          style={[
            styles.decorCircle,
            styles.decorCircle2,
            { backgroundColor: theme.colors.primary, opacity: 0.05 },
          ]}
        />

        <SafeAreaView style={styles.topContent}>
          {/* Icon circle */}
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.logoContainer}
          >
            <View
              style={[
                styles.logoCircle,
                {
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                },
              ]}
            >
              <Text style={styles.logoEmoji}>{'\u2728'}</Text>
            </View>
          </Animated.View>

          {/* Headline */}
          <Animated.Text
            entering={FadeInDown.delay(350).springify()}
            style={[
              styles.headline,
              {
                fontFamily: theme.font('700'),
              },
            ]}
          >
            {t('completeProfile.headline')}
          </Animated.Text>

          {/* Subtitle */}
          <Animated.Text
            entering={FadeInDown.delay(450).springify()}
            style={[
              styles.subtitle,
              {
                fontFamily: theme.font('400'),
              },
            ]}
          >
            {t('completeProfile.subtitle')}
          </Animated.Text>
        </SafeAreaView>
      </View>

      {/* Bottom zone — cream/surface background */}
      <View style={[styles.bottomSection, { backgroundColor: theme.colors.surface }]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            {/* Form card */}
            <Animated.View
              entering={FadeInUp.delay(500).springify()}
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              pointerEvents={isSubmitting ? 'none' : 'auto'}
            >
              {visibleFields.has('firstName') && (
                <Animated.View entering={FadeInUp.delay(fieldDelays.firstName).springify()}>
                  <Input
                    label={t('completeProfile.firstName')}
                    placeholder={t('completeProfile.firstNamePlaceholder')}
                    value={firstName}
                    onChangeText={(v) => {
                      setFirstName(v);
                      if (errors.firstName) setErrors((e) => ({ ...e, firstName: '' }));
                    }}
                    error={errors.firstName}
                    autoCapitalize="words"
                    returnKeyType="next"
                    textContentType="givenName"
                    containerStyle={styles.field}
                  />
                  {/* Divider if more fields follow */}
                  {(visibleFields.has('lastName') || visibleFields.has('phone')) && (
                    <View
                      style={[
                        styles.fieldDivider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                  )}
                </Animated.View>
              )}

              {visibleFields.has('lastName') && (
                <Animated.View entering={FadeInUp.delay(fieldDelays.lastName).springify()}>
                  <Input
                    label={t('completeProfile.lastName')}
                    placeholder={t('completeProfile.lastNamePlaceholder')}
                    value={lastName}
                    onChangeText={(v) => {
                      setLastName(v);
                      if (errors.lastName) setErrors((e) => ({ ...e, lastName: '' }));
                    }}
                    error={errors.lastName}
                    autoCapitalize="words"
                    returnKeyType={visibleFields.has('phone') ? 'next' : 'done'}
                    textContentType="familyName"
                    containerStyle={styles.field}
                  />
                  {/* Divider if more fields follow */}
                  {visibleFields.has('phone') && (
                    <View
                      style={[
                        styles.fieldDivider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                  )}
                </Animated.View>
              )}

              {visibleFields.has('phone') && (
                <Animated.View entering={FadeInUp.delay(fieldDelays.phone).springify()}>
                  <Input
                    label={t('completeProfile.phone')}
                    placeholder="50-000-0000"
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v);
                      if (errors.phone) setErrors((e) => ({ ...e, phone: '' }));
                    }}
                    error={errors.phone}
                    keyboardType="phone-pad"
                    prefix="+972"
                    forceLTR
                    returnKeyType="done"
                    textContentType="telephoneNumber"
                    containerStyle={styles.field}
                  />
                </Animated.View>
              )}

              {/* Email — disabled input inside form card */}
              <View
                style={[styles.fieldDivider, { backgroundColor: theme.colors.border }]}
              />
              <Animated.View entering={FadeInUp.delay(fieldDelays.emailRow).springify()}>
                <Input
                  label={t('completeProfile.email')}
                  value={user?.email ?? ''}
                  onChangeText={() => {}}
                  editable={false}
                  forceLTR
                  containerStyle={[styles.field, { opacity: 0.5 }]}
                />
              </Animated.View>
            </Animated.View>

            {/* Form-level error */}
            {errors._form ? (
              <Text
                style={[
                  styles.formError,
                  {
                    color: theme.colors.error,
                    fontFamily: theme.font('400'),
                  },
                ]}
              >
                {errors._form}
              </Text>
            ) : null}
          </ScrollView>

          {/* Sticky submit button */}
          <Animated.View
            entering={FadeInUp.delay(800).springify()}
            style={[
              styles.buttonContainer,
              {
                backgroundColor: theme.colors.card,
                shadowColor: '#000',
              },
            ]}
          >
            <Button
              title={t('completeProfile.save')}
              onPress={handleSubmit}
              variant="primary"
              size="large"
              loading={isSubmitting}
              disabled={!isFormValid}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flex: 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  decorCircle1: {
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    top: -SCREEN_WIDTH * 0.5,
    end: -SCREEN_WIDTH * 0.3,
  },
  decorCircle2: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    bottom: -SCREEN_WIDTH * 0.3,
    start: -SCREEN_WIDTH * 0.2,
  },
  topContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 38,
  },
  headline: {
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  bottomSection: {
    flex: 1.3,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 16,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  field: {
    marginBottom: 4,
    marginTop: 4,
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  formError: {
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
});
