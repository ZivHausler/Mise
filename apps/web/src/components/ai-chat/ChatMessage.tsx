import React from 'react';
import Markdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { EntityReference } from '@/api/useAiChat';
import { EntityReferenceList } from './EntityReferenceList';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  references?: EntityReference[];
}

export const ChatMessage = React.memo(function ChatMessage({
  role,
  content,
  isStreaming,
  references,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 mt-1">
          <Sparkles className="h-3.5 w-3.5 text-primary-500" />
        </div>
      )}
      <div className="max-w-[80%] min-w-0 flex flex-col">
        <div
          className={cn(
            'px-4 py-2.5 text-body-sm',
            isUser
              ? 'self-end bg-primary-500 text-white rounded-2xl rounded-ee-md'
              : 'self-start bg-neutral-100 text-neutral-800 rounded-2xl rounded-ss-md',
          )}
        >
          <div className="break-words prose prose-sm prose-neutral max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-4 [&_ol]:ps-4 [&_li]:my-0.5 [&_li]:ps-0 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h3]:font-medium [&_h1]:my-1 [&_h2]:my-1 [&_h3]:my-1">
            <Markdown>{content}</Markdown>
            {isStreaming && (
              <span className="ms-0.5 inline-block animate-pulse text-current">|</span>
            )}
          </div>
        </div>

        {!isUser && references && references.length > 0 && (
          <EntityReferenceList references={references} />
        )}
      </div>
    </div>
  );
});
