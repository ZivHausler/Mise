import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/app';

export const AiChatFab = React.memo(function AiChatFab() {
  const { t } = useTranslation();
  const open = useAppStore((s) => s.aiChatOpen);
  const toggleAiChat = useAppStore((s) => s.toggleAiChat);

  if (open) return null;

  return (
    <button
      type="button"
      onClick={toggleAiChat}
      className="fixed bottom-[88px] end-4 z-[25] flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary-500 shadow-lg border border-neutral-200 transition-all duration-normal hover:shadow-xl hover:scale-105 active:scale-95 lg:bottom-6 lg:end-6"
      aria-label={t('chat.title')}
    >
      <Sparkles className="h-6 w-6" />
    </button>
  );
});
