import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, X, ExternalLink, Copy } from 'lucide-react';
import { TranslateButton } from '@/components/TranslateButton';
import axios from 'axios';
import { Card, Section, Stack } from '@/components/Layout';
import { TextInput, Toggle, Select } from '@/components/FormFields';
import { STORE_CATEGORIES } from '@mise/shared';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Feedback';
import { ImageUploadZone } from '@/components/ImageUploadZone';
import {
  useCurrentStore,
  useUpdateSlug,
  useUpdateStorefrontEnabled,
  useGenerateBrandingUploadUrl,
  useUpdateBranding,
  checkSlugAvailability,
} from '@/api/hooks';
import { useToastStore } from '@/store/toast';
import { useAuthStore } from '@/store/auth';

const MAX_DESCRIPTION_LENGTH = 500;

export default function StorefrontTab() {
  const { t } = useTranslation();
  const { data: store, isLoading } = useCurrentStore();
  const updateSlug = useUpdateSlug();
  const updateStorefront = useUpdateStorefrontEnabled();
  const generateUploadUrl = useGenerateBrandingUploadUrl();
  const updateBranding = useUpdateBranding();
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  // Slug state
  const [slug, setSlug] = useState('');
  const [slugDirty, setSlugDirty] = useState(false);
  const [slugError, setSlugError] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Branding state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [brandingDirty, setBrandingDirty] = useState(false);

  // Category state
  const [categorySubject, setCategorySubject] = useState('');
  const [categorySubSubject, setCategorySubSubject] = useState('');

  useEffect(() => {
    if (store?.slug) {
      setSlug(store.slug);
      setSlugDirty(false);
    }
  }, [store?.slug]);

  useEffect(() => {
    if (store) {
      setLogoUrl(store.logoUrl ?? null);
      setBannerUrl(store.bannerUrl ?? null);
      setDescription(store.description ?? '');
      setDescriptionEn(store.descriptionEn ?? '');
      setBrandingDirty(false);
    }
  }, [store?.logoUrl, store?.bannerUrl, store?.description, store?.descriptionEn]);

  useEffect(() => {
    if (store) {
      setCategorySubject(store.categorySubject ?? '');
      setCategorySubSubject(store.categorySubSubject ?? '');
    }
  }, [store?.categorySubject, store?.categorySubSubject]);

  const validateSlugFormat = (value: string): boolean => {
    if (value.length < 3) {
      setSlugError(t('settings.storefront.slugTooShort', 'Slug must be at least 3 characters'));
      return false;
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value)) {
      setSlugError(t('settings.storefront.slugInvalid', 'Only lowercase letters, numbers, and hyphens allowed'));
      return false;
    }
    setSlugError('');
    return true;
  };

  const checkAvailability = useCallback(async (value: string) => {
    if (!validateSlugFormat(value)) {
      setSlugAvailable(null);
      return;
    }
    if (value === store?.slug) {
      setSlugAvailable(null);
      setSlugError('');
      return;
    }
    setCheckingSlug(true);
    try {
      const res = await checkSlugAvailability(value);
      setSlugAvailable(res.available);
      if (!res.available) {
        setSlugError(t('settings.storefront.slugTaken', 'This slug is already taken'));
      } else {
        setSlugError('');
      }
    } catch {
      setSlugError(t('settings.storefront.slugCheckFailed', 'Could not check availability'));
    } finally {
      setCheckingSlug(false);
    }
  }, [store?.slug, t]);

  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(normalized);
    setSlugDirty(normalized !== store?.slug);
    setSlugAvailable(null);
    setSlugError('');
  };

  const handleSlugSave = () => {
    if (!validateSlugFormat(slug)) return;
    updateSlug.mutate({ slug }, {
      onSuccess: () => {
        setSlugDirty(false);
        setSlugAvailable(null);
      },
    });
  };

  const handleToggleStorefront = (enabled: boolean) => {
    updateStorefront.mutate({ enabled });
  };

  const publicUrl = `https://mise.co.il/s/${slug}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    addToast('success', t('settings.storefront.urlCopied', 'URL copied to clipboard'));
  };

  // Branding upload handler
  const handleBrandingUpload = useCallback(
    async (type: 'logo' | 'banner', file: File): Promise<string> => {
      const { uploadUrl, publicUrl } = await generateUploadUrl.mutateAsync({
        type,
        mimeType: file.type,
      });
      // PUT the raw file to the signed URL
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });
      return publicUrl;
    },
    [generateUploadUrl],
  );

  const handleLogoChange = (url: string | null) => {
    setLogoUrl(url);
    setBrandingDirty(true);
  };

  const handleBannerChange = (url: string | null) => {
    setBannerUrl(url);
    setBrandingDirty(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
      setBrandingDirty(true);
    }
  };

  const handleDescriptionEnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescriptionEn(value);
      setBrandingDirty(true);
    }
  };

  const handleSubjectChange = (value: string) => {
    setCategorySubject(value);
    setCategorySubSubject('');
    setBrandingDirty(true);
  };

  const noneOption = { value: '', label: t('common.none', 'None') };

  const subjectOptions = [
    noneOption,
    ...STORE_CATEGORIES.map((cat) => ({
      value: cat.key,
      label: t(`categories.subjects.${cat.key}`, cat.key),
    })),
  ];

  const subSubjectOptions = categorySubject
    ? [
        noneOption,
        ...(STORE_CATEGORIES.find((c) => c.key === categorySubject)?.subSubjects ?? []).map((sub) => ({
          value: sub,
          label: t(`categories.subSubjects.${sub}`, sub),
        })),
      ]
    : [];

  const handleBrandingSave = () => {
    updateBranding.mutate(
      {
        logoUrl,
        bannerUrl,
        description: description || null,
        descriptionEn: descriptionEn || null,
        categorySubject: categorySubject || null,
        categorySubSubject: categorySubSubject || null,
      },
      {
        onSuccess: () => {
          setBrandingDirty(false);
        },
      },
    );
  };

  if (isLoading) return <Spinner />;

  return (
    <Stack gap={6}>
      {/* Store Branding Section */}
      <Section title={t('settings.storefront.branding.title', 'Store Branding')}>
        <p className="mb-4 text-body-sm text-neutral-500">
          {t('settings.storefront.branding.description', "Customize your store's appearance on the storefront")}
        </p>
        <Card>
          <Stack gap={6}>
            {/* Logo and Banner uploads */}
            <div className="flex flex-col lg:flex-row gap-6">
              <ImageUploadZone
                value={logoUrl}
                onChange={handleLogoChange}
                aspectRatio="1:1"
                label={t('settings.storefront.branding.logo', 'Store Logo')}
                hint={t('settings.storefront.branding.logoHint', 'Recommended: 512x512px, max 2MB')}
                maxSizeMB={2}
                onUpload={(file) => handleBrandingUpload('logo', file)}
                disabled={updateBranding.isPending}
              />
              <ImageUploadZone
                value={bannerUrl}
                onChange={handleBannerChange}
                aspectRatio="2:1"
                label={t('settings.storefront.branding.banner', 'Store Banner')}
                hint={t('settings.storefront.branding.bannerHint', 'Recommended: 1200x400px, max 5MB')}
                maxSizeMB={5}
                onUpload={(file) => handleBrandingUpload('banner', file)}
                disabled={updateBranding.isPending}
              />
            </div>

            {/* Description textareas */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <label className="text-body-sm font-medium text-neutral-700 mb-1 block">
                  {t('settings.storefront.branding.storeDescription', 'Store Description')}
                </label>
                <textarea
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder={t('settings.storefront.branding.descriptionPlaceholder', 'Tell customers about your bakery...')}
                  rows={3}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  disabled={updateBranding.isPending}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-body-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 resize-none"
                />
                <p className="mt-1 text-end text-body-sm text-neutral-400">
                  {t('settings.storefront.branding.charCount', '{{count}}/{{max}}', {
                    count: description.length,
                    max: MAX_DESCRIPTION_LENGTH,
                  })}
                </p>
              </div>
              <div className="flex-1">
                <label className="text-body-sm font-medium text-neutral-700 mb-1 block">
                  {t('settings.storefront.branding.storeDescriptionEn', 'Store Description (English)')} ({t('common.optional')})
                </label>
                <textarea
                  value={descriptionEn}
                  onChange={handleDescriptionEnChange}
                  placeholder="Tell customers about your bakery..."
                  rows={3}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  disabled={updateBranding.isPending}
                  dir="ltr"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-body-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 resize-none"
                />
                <div className="mt-1 flex items-center justify-between">
                  <TranslateButton
                    hebrewText={description}
                    onTranslate={(text) => { setDescriptionEn(text); setBrandingDirty(true); }}
                    fieldType="description"
                  />
                  <p className="text-body-sm text-neutral-400">
                    {t('settings.storefront.branding.charCount', '{{count}}/{{max}}', {
                      count: descriptionEn.length,
                      max: MAX_DESCRIPTION_LENGTH,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Category dropdowns */}
            <div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Select
                  label={t('settings.storefront.branding.categorySubject', 'Store Category')}
                  options={subjectOptions}
                  value={categorySubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  disabled={updateBranding.isPending}
                  className="flex-1"
                />
                <Select
                  label={t('settings.storefront.branding.categorySubSubject', 'Sub-Category')}
                  options={subSubjectOptions}
                  value={categorySubSubject}
                  onChange={(e) => { setCategorySubSubject(e.target.value); setBrandingDirty(true); }}
                  disabled={!categorySubject || updateBranding.isPending}
                  className="flex-1"
                />
              </div>
              <p className="mt-2 text-body-sm text-neutral-400">
                {t('settings.storefront.branding.categoryHint', 'Helps customers find your store in the app.')}
              </p>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleBrandingSave}
                disabled={!brandingDirty || updateBranding.isPending}
              >
                {updateBranding.isPending ? <Spinner size="sm" /> : t('common.save', 'Save')}
              </Button>
            </div>
          </Stack>
        </Card>
      </Section>

      {/* Existing Storefront Settings Section */}
      <Section title={t('settings.storefront.title', 'Storefront')}>
        <p className="mb-4 text-body-sm text-neutral-500">
          {t('settings.storefront.description', 'Configure your public storefront for customer ordering.')}
        </p>
        <Card>
          <Stack gap={4}>
            <div>
              <label className="text-body-sm font-medium text-neutral-700 mb-1 block">
                {t('settings.storefront.slug', 'Store URL Slug')}
              </label>
              {isAdmin ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <TextInput
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        onBlur={() => slug && checkAvailability(slug)}
                        placeholder="my-bakery"
                        dir="ltr"
                      />
                    </div>
                    {slugDirty && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSlugSave}
                        disabled={!!slugError || updateSlug.isPending || checkingSlug}
                      >
                        {updateSlug.isPending ? <Spinner /> : t('common.save', 'Save')}
                      </Button>
                    )}
                  </div>
                  {slugError && (
                    <p className="mt-1 text-body-sm text-red-500 flex items-center gap-1">
                      <X className="h-3.5 w-3.5" />
                      {slugError}
                    </p>
                  )}
                  {slugAvailable === true && !slugError && (
                    <p className="mt-1 text-body-sm text-green-600 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" />
                      {t('settings.storefront.slugAvailable', 'This slug is available')}
                    </p>
                  )}
                  {checkingSlug && (
                    <p className="mt-1 text-body-sm text-neutral-500">
                      {t('settings.storefront.checking', 'Checking availability...')}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <span className="text-body-sm text-neutral-700 flex-1" dir="ltr">{slug}</span>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <Toggle
                label={t('settings.storefront.enable', 'Enable Storefront')}
                checked={store?.storefrontEnabled ?? false}
                onChange={handleToggleStorefront}
                disabled={updateStorefront.isPending}
              />
              <p className="mt-1 text-body-sm text-neutral-500">
                {t('settings.storefront.enableDescription', 'When enabled, customers can browse your menu and place orders through the storefront app.')}
              </p>
            </div>

            {store?.storefrontEnabled && (
              <div className="border-t border-neutral-200 pt-4">
                <label className="text-body-sm font-medium text-neutral-700 mb-1 block">
                  {t('settings.storefront.publicUrl', 'Public URL')}
                </label>
                <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <Globe className="h-4 w-4 text-neutral-400 shrink-0" />
                  <span className="text-body-sm text-neutral-700 truncate flex-1" dir="ltr">{publicUrl}</span>
                  <button onClick={handleCopyUrl} className="text-neutral-400 hover:text-neutral-600" title={t('common.copy', 'Copy')}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-600">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
          </Stack>
        </Card>
      </Section>
    </Stack>
  );
}
