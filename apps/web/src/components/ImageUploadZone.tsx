import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, RefreshCw, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/Feedback';
import { useToastStore } from '@/store/toast';
import { cn } from '@/utils/cn';

interface ImageUploadZoneProps {
  value: string | null;
  onChange: (url: string | null) => void;
  aspectRatio: '1:1' | '2:1' | '3:1';
  label: string;
  hint?: string;
  maxSizeMB?: number;
  accept?: string;
  onUpload: (file: File) => Promise<string>;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const ImageUploadZone = React.memo(function ImageUploadZone({
  value,
  onChange,
  aspectRatio,
  label,
  hint,
  maxSizeMB = 2,
  accept = 'image/jpeg,image/png,image/webp',
  onUpload,
  disabled = false,
}: ImageUploadZoneProps) {
  const { t } = useTranslation();
  const addToast = useToastStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        addToast('error', t('settings.storefront.branding.invalidType'));
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        addToast('error', t('settings.storefront.branding.fileTooLarge', { max: maxSizeMB }));
        return false;
      }
      return true;
    },
    [addToast, maxSizeMB, t],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;
      setUploading(true);
      try {
        const publicUrl = await onUpload(file);
        onChange(publicUrl);
      } catch {
        addToast('error', t('settings.storefront.branding.uploadFailed'));
      } finally {
        setUploading(false);
      }
    },
    [validateFile, onUpload, onChange, addToast, t],
  );

  const handleClick = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    try {
      if (file) await handleFile(file);
    } catch {
      addToast('error', t('settings.storefront.branding.uploadFailed'));
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const isSquare = aspectRatio === '1:1';

  const zoneClasses = cn(
    'relative overflow-hidden rounded-lg transition-colors',
    isSquare ? 'w-28 h-28 lg:w-40 lg:h-40' : aspectRatio === '2:1' ? 'h-28 lg:h-40 aspect-[2/1]' : 'w-full aspect-[3/1]',
    disabled && 'opacity-50 cursor-not-allowed',
  );

  const textBlock = (
    <div className="flex flex-col mt-1.5">
      <span className="text-body-sm font-medium text-neutral-700">{label}</span>
      {hint && <span className="text-body-sm text-neutral-400 whitespace-pre-line">{hint}</span>}
    </div>
  );

  const wrapperClass = 'flex flex-col';

  // Empty state
  if (!value && !uploading) {
    return (
      <div className={wrapperClass}>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            zoneClasses,
            'flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 cursor-pointer shrink-0',
          )}
        >
          <Upload className="h-6 w-6 text-neutral-400" />
          <span className="text-body-sm text-neutral-500">
            {t('settings.storefront.branding.clickToUpload')}
          </span>
        </button>
        {textBlock}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          aria-label={label}
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // Uploading state
  if (uploading) {
    return (
      <div className={wrapperClass}>
        <div
          className={cn(
            zoneClasses,
            'flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary-300 bg-primary-50 shrink-0',
          )}
        >
          <Spinner size="md" />
          <span className="text-body-sm text-primary-600">
            {t('settings.storefront.branding.uploading')}
          </span>
        </div>
        {textBlock}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          aria-label={label}
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // Preview state
  const overlayVisible = hovering || showOverlay;

  return (
    <div className={wrapperClass}>
      <div
        className={cn(zoneClasses, 'shrink-0')}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => !disabled && setShowOverlay((v) => !v)}
      >
        <img
          src={value!}
          alt={label}
          className="h-full w-full object-cover"
        />
        {overlayVisible && !disabled && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40">
            <button
              type="button"
              onClick={handleReplace}
              aria-label={t('settings.storefront.branding.replace')}
              className="flex items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-body-sm font-medium text-neutral-700 hover:bg-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('settings.storefront.branding.replace')}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              aria-label={t('settings.storefront.branding.remove')}
              className="flex items-center gap-1 rounded-md bg-white/90 px-3 py-1.5 text-body-sm font-medium text-red-600 hover:bg-white transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('settings.storefront.branding.remove')}
            </button>
          </div>
        )}
      </div>
      {textBlock}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={label}
        onChange={handleInputChange}
      />
    </div>
  );
});
