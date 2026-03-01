import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Sparkles, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/store/app';
import { streamChat } from '@/api/useAiChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AiChatPanel = React.memo(function AiChatPanel() {
  const { t, i18n } = useTranslation();
  const open = useAppStore((s) => s.aiChatOpen);
  const setOpen = useAppStore((s) => s.setAiChatOpen);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, scrollToBottom]);

  // Escape key closes panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setActiveToolCall(null);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      setError(null);
      setActiveToolCall(null);

      const userMessage: Message = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMessage]);

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setIsStreaming(true);
      let assistantContent = '';

      // Add empty assistant message to stream into
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      try {
        const language = (i18n.language === 'he' ? 'he' : 'en') as 'en' | 'he';
        for await (const event of streamChat(text, history, language)) {
          switch (event.type) {
            case 'token': {
              const tokenText = (event.data as { text?: string }).text ?? '';
              assistantContent += tokenText;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: assistantContent,
                };
                return updated;
              });
              break;
            }
            case 'tool_call': {
              const tool = (event.data as { tool?: string }).tool ?? '';
              setActiveToolCall(tool);
              break;
            }
            case 'tool_result': {
              setActiveToolCall(null);
              break;
            }
            case 'done': {
              const fullText = (event.data as { fullText?: string }).fullText;
              if (fullText) {
                assistantContent = fullText;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullText,
                  };
                  return updated;
                });
              }
              break;
            }
            case 'error': {
              const errMsg =
                (event.data as { message?: string }).message ??
                t('chat.errorUnavailable');
              setError(errMsg);
              // Remove the empty assistant message
              if (!assistantContent) {
                setMessages((prev) => prev.slice(0, -1));
              }
              break;
            }
          }
        }
      } catch {
        setError(t('chat.errorUnavailable'));
        if (!assistantContent) {
          setMessages((prev) => prev.slice(0, -1));
        }
      } finally {
        setIsStreaming(false);
        setActiveToolCall(null);
      }
    },
    [messages, i18n.language, t],
  );

  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      handleSend(prompt);
    },
    [handleSend],
  );

  if (!open) return null;

  const suggestedPrompts = [
    { key: 'suggestedTopSellers', label: t('chat.suggestedTopSellers') },
    { key: 'suggestedTodayOrders', label: t('chat.suggestedTodayOrders') },
    { key: 'suggestedLowStock', label: t('chat.suggestedLowStock') },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-modal bg-black/50 lg:hidden"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed z-modal flex flex-col bg-white shadow-xl',
          // Mobile: full screen
          'inset-0',
          // Desktop: slide-over from end
          'lg:inset-y-0 lg:inset-start-auto lg:inset-end-0 lg:w-[380px] lg:border-s lg:border-neutral-200',
          'animate-slide-in',
        )}
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.title')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-500" />
            <h2 className="font-heading text-h4 text-neutral-800">
              {t('chat.title')}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleNewConversation}
                className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                aria-label={t('chat.newConversation')}
                title={t('chat.newConversation')}
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <Sparkles className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <p className="font-heading text-h4 text-neutral-800">
                  {t('chat.greeting')}
                </p>
                <p className="mt-1 text-body-sm text-neutral-500">
                  {t('chat.greetingBody')}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.key}
                    type="button"
                    onClick={() => handleSuggestedPrompt(prompt.label)}
                    className={cn(
                      'rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-caption text-primary-700',
                      'hover:bg-primary-100 hover:border-primary-300 transition-colors',
                    )}
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={
                    isStreaming &&
                    idx === messages.length - 1 &&
                    msg.role === 'assistant'
                  }
                />
              ))}

              {/* Tool call indicator */}
              {activeToolCall && (
                <div className="flex items-center gap-2 ps-8">
                  <div className="flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-caption text-primary-600">
                    <div className="flex gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{t('chat.fetchingData')}</span>
                  </div>
                </div>
              )}

              {/* Typing indicator (when streaming but no content yet) */}
              {isStreaming && !activeToolCall && messages[messages.length - 1]?.content === '' && (
                <div className="flex items-center gap-2 ps-8">
                  <div className="flex gap-1 rounded-2xl rounded-ss-md bg-neutral-100 px-4 py-3">
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mx-8 rounded-lg bg-error-light px-3 py-2 text-caption text-error-dark">
                  {error}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </>
  );
});
