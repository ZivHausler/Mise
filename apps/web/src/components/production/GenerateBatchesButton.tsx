import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { useGenerateBatches } from '@/api/hooks';

interface GenerateBatchesButtonProps {
  date: string;
}

export function GenerateBatchesButton({ date }: GenerateBatchesButtonProps) {
  const { t } = useTranslation();
  const generateBatches = useGenerateBatches();

  const handleClick = () => {
    if (confirm(t('production.generateConfirm', { date }))) {
      generateBatches.mutate({ date });
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={generateBatches.isPending}
    >
      <Wand2 className="h-4 w-4 me-1" />
      {t('production.generate')}
    </Button>
  );
}
