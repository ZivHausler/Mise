import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = React.memo(function ChatMessage({
  role,
  content,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 mt-1">
          <Sparkles className="h-3.5 w-3.5 text-primary-500" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5 text-body-sm',
          isUser
            ? 'self-end bg-primary-500 text-white rounded-2xl rounded-ee-md'
            : 'self-start bg-neutral-100 text-neutral-800 rounded-2xl rounded-ss-md',
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <span className="ms-0.5 inline-block animate-pulse text-current">|</span>
          )}
        </div>
      </div>
    </div>
  );
});
