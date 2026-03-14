import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';
import { useDirection } from '../../contexts/DirectionContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
}

interface CustomerFormProps {
  data: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  onNext: () => void;
  errors: Partial<Record<keyof CustomerFormData, string>>;
}

export function CustomerForm({ data, onChange, onNext, errors }: CustomerFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { direction } = useDirection();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentInset={{ bottom: 40 }}
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIconCircle,
              { backgroundColor: `${theme.colors.primary}12` },
            ]}
          >
            <Text style={styles.sectionIcon}>{'\u{1F464}'}</Text>
          </View>
          <View style={styles.sectionTextContainer}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.colors.textStrong,
                  fontFamily: theme.font('600'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.stepDetails')}
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color: theme.colors.textTertiary,
                  fontFamily: theme.font('400'),
                  writingDirection: direction,
                },
              ]}
            >
              {t('checkout.customerFormSubtitle')}
            </Text>
          </View>
        </View>

        {/* Form card */}
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Input
            label={t('checkout.name')}
            value={data.name}
            onChangeText={(name) => onChange({ ...data, name })}
            placeholder={t('checkout.namePlaceholder')}
            error={errors.name}
            autoCapitalize="words"
            returnKeyType="next"
            containerStyle={styles.field}
          />

          <View style={[styles.fieldDivider, { backgroundColor: theme.colors.border }]} />

          <Input
            label={t('checkout.phone')}
            value={data.phone}
            onChangeText={(phone) => onChange({ ...data, phone })}
            placeholder={t('checkout.phonePlaceholder')}
            error={errors.phone}
            keyboardType="phone-pad"
            prefix="+972"
            forceLTR
            returnKeyType="next"
            containerStyle={styles.field}
          />

          <View style={[styles.fieldDivider, { backgroundColor: theme.colors.border }]} />

          <Input
            label={t('checkout.email')}
            hint={t('checkout.emailOptional')}
            value={data.email}
            onChangeText={(email) => onChange({ ...data, email })}
            placeholder={t('checkout.emailPlaceholder')}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            forceLTR
            returnKeyType="done"
            containerStyle={styles.field}
          />
          {data.email.length > 0 && !data.email.includes('@') && (
            <View style={styles.emailChipsRow}>
              {['@gmail.com', '@hotmail.com'].map((domain) => (
                <Pressable
                  key={domain}
                  onPress={() => onChange({ ...data, email: data.email + domain })}
                  style={({ pressed }) => [
                    styles.emailChip,
                    {
                      backgroundColor: pressed
                        ? `${theme.colors.primary}20`
                        : `${theme.colors.primary}10`,
                      borderColor: `${theme.colors.primary}30`,
                    },
                  ]}
                  hitSlop={4}
                >
                  <Text
                    style={[
                      styles.emailChipText,
                      {
                        color: theme.colors.primary,
                        fontFamily: theme.font('500'),
                      },
                    ]}
                  >
                    {domain}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.buttonContainer,
          {
            backgroundColor: theme.colors.card,
            shadowColor: '#000',
          },
        ]}
      >
        <Button
          title={t('checkout.continue')}
          onPress={onNext}
          variant="primary"
          size="large"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTextContainer: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
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
  emailChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  emailChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  emailChipText: {
    fontSize: 13,
    fontWeight: '500',
    writingDirection: 'ltr',
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  buttonContainer: {
    padding: 20,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
});
