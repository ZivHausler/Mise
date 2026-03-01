import React, { useCallback, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = React.memo(function ChatInput({
  onSend,
  disabled,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      adjustHeight();
    },
    [adjustHeight],
  );

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="border-t border-neutral-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-body-sm text-neutral-800',
            'placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{ minHeight: '42px', maxHeight: '128px' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-normal',
            'bg-primary-500 text-white hover:bg-primary-600 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500',
          )}
          aria-label={t('chat.send')}
        >
          <Send className="h-4.5 w-4.5 rtl:scale-x-[-1]" />
        </button>
      </div>
    </div>
  );
});
