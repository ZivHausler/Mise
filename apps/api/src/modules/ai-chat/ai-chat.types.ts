export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  language: 'en' | 'he';
}

export interface ChatResponse {
  reply: string;
  toolCalls?: { tool: string; summary: string }[];
}

export interface ChatStreamEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'done' | 'error';
  data: Record<string, unknown>;
}
