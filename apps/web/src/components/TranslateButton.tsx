import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Loader2, Check } from 'lucide-react';
import { useTranslate, useFeatureFlags } from '@/api/hooks';
import { useToastStore } from '@/store/toast';
import { cn } from '@/utils/cn';

interface TranslateButtonProps {
  hebrewText: string;
  onTranslate: (text: string) => void;
  fieldType?: 'name' | 'description';
  className?: string;
}

export function TranslateButton({ hebrewText, onTranslate, fieldType = 'name', className }: TranslateButtonProps) {
  const { t } = useTranslation();
  const { data: featureFlags } = useFeatureFlags();
  const translate = useTranslate();
  const addToast = useToastStore((s) => s.addToast);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTranslate = useCallback(() => {
    if (status === 'loading') return;
    setStatus('loading');
    translate.mutate(
      { text: hebrewText.trim(), fieldType },
      {
        onSuccess: (data) => {
          onTranslate(data.translation);
          setStatus('success');
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setStatus('idle'), 1500);
        },
        onError: () => {
          addToast('error', t('common.translateError'));
          setStatus('idle');
        },
      },
    );
  }, [hebrewText, fieldType, status, translate, onTranslate, addToast, t]);

  if (!featureFlags?.ai_chat) return null;
  if (!hebrewText.trim()) return null;

  const icon =
    status === 'loading' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : status === 'success' ? (
      <Check className="h-3.5 w-3.5" />
    ) : (
      <Languages className="h-3.5 w-3.5" />
    );

  const label =
    status === 'loading'
      ? t('common.translating')
      : status === 'success'
        ? t('common.translated')
        : t('common.translateToEnglish');

  return (
    <button
      type="button"
      onClick={handleTranslate}
      disabled={status === 'loading'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1',
        'text-body-sm font-medium transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        status === 'success'
          ? 'text-green-600'
          : 'text-primary-600 hover:bg-primary-50 hover:text-primary-700',
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
