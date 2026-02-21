import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useGenerateUploadUrls, useDeleteRecipeImage } from '@/api/hooks';
import { cn } from '@/utils/cn';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface RecipeImageUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function RecipeImageUpload({ photos, onChange, maxPhotos = 3 }: RecipeImageUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUrls = useGenerateUploadUrls();
  const deleteImage = useDeleteRecipeImage();

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) return;

    const validFiles: File[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    setUploading(true);
    try {
      const result = await generateUrls.mutateAsync({
        count: validFiles.length,
        mimeTypes: validFiles.map((f) => f.type),
      });

      const newUrls: string[] = [];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i]!;
        const slot = result.slots[i]!;

        const uploadRes = await fetch(slot.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          console.error('Upload failed', uploadRes.status, await uploadRes.text());
          continue;
        }

        newUrls.push(slot.publicUrl);
      }

      onChange([...photos, ...newUrls]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [photos, maxPhotos, generateUrls, onChange]);

  const handleRemove = useCallback((index: number) => {
    const url = photos[index]!;
    deleteImage.mutate(url);
    onChange(photos.filter((_, i) => i !== index));
  }, [photos, onChange, deleteImage]);

  return (
    <div className="flex flex-wrap gap-3">
      {photos.map((url, i) => (
        <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => handleRemove(i)}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {photos.length < maxPhotos && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-primary-400 hover:text-primary-500 dark:border-neutral-600 dark:hover:border-primary-500',
            uploading && 'pointer-events-none opacity-50',
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-[10px] font-medium">{t('recipes.addPhoto')}</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
    </div>
  );
}
