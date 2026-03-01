/**
 * SSE stream consumer for the AI chat endpoint.
 * Uses native fetch (not Axios) with ReadableStream reader.
 */

export interface AiChatEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'done' | 'error';
  data: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function* streamChat(
  message: string,
  history: ChatMessage[],
  language: 'en' | 'he',
): AsyncGenerator<AiChatEvent> {
  const token = localStorage.getItem('auth_token');

  const response = await fetch('/api/ai-chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history, language }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    yield { type: 'error', data: { message: text } };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { type: 'error', data: { message: 'No response body' } };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE format: event: type\ndata: json\n\n
      const parts = buffer.split('\n\n');
      // Keep the last potentially incomplete chunk in the buffer
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        let eventType = 'message';
        let eventData = '';

        for (const line of trimmed.split('\n')) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData = line.slice(5).trim();
          }
        }

        if (!eventData) continue;

        try {
          const parsed = JSON.parse(eventData);
          yield {
            type: eventType as AiChatEvent['type'],
            data: parsed,
          };
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
