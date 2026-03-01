import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

// Mock env
vi.mock('../../../src/config/env.js', () => ({
  env: { GEMINI_API_KEY: 'test-key' },
}));

// Mock tools
const mockExecuteToolCall = vi.fn();
vi.mock('../../../src/modules/ai-chat/ai-chat.tools.js', () => ({
  toolDeclarations: [],
  executeToolCall: (...args: unknown[]) => mockExecuteToolCall(...args),
}));

import { streamChat, chat } from '../../../src/modules/ai-chat/ai-chat.service.js';
import type { ChatRequest } from '../../../src/modules/ai-chat/ai-chat.types.js';

const STORE_ID = 1;
const STORE_NAME = 'Test Bakery';

function makeRequest(overrides?: Partial<ChatRequest>): ChatRequest {
  return {
    message: 'Hello',
    history: [],
    language: 'he',
    ...overrides,
  };
}

function makeTextResponse(text: string) {
  return {
    candidates: [
      {
        content: {
          role: 'model',
          parts: [{ text }],
        },
      },
    ],
  };
}

function makeFunctionCallResponse(name: string, args: Record<string, unknown>) {
  return {
    candidates: [
      {
        content: {
          role: 'model',
          parts: [{ functionCall: { name, args } }],
        },
      },
    ],
  };
}

describe('ai-chat service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('streamChat', () => {
    it('yields token and done events for a text response', async () => {
      mockGenerateContent.mockResolvedValue(makeTextResponse('Hello bakery owner!'));

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, makeRequest())) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'token', data: { text: 'Hello bakery owner!' } });
      expect(events[1]).toEqual({ type: 'done', data: {} });
    });

    it('passes Hebrew language instruction in system prompt', async () => {
      mockGenerateContent.mockResolvedValue(makeTextResponse('ok'));

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, makeRequest({ language: 'he' }))) {
        events.push(event);
      }

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain('Hebrew');
      expect(callArgs.config.systemInstruction).not.toContain('English');
    });

    it('passes English language instruction in system prompt', async () => {
      mockGenerateContent.mockResolvedValue(makeTextResponse('ok'));

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, makeRequest({ language: 'en' }))) {
        events.push(event);
      }

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain('English');
    });

    it('includes store name in system prompt', async () => {
      mockGenerateContent.mockResolvedValue(makeTextResponse('ok'));

      const events = [];
      for await (const event of streamChat(STORE_ID, 'My Awesome Bakery', makeRequest())) {
        events.push(event);
      }

      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs.config.systemInstruction).toContain('My Awesome Bakery');
    });

    it('converts history user role to "user" and assistant role to "model"', async () => {
      mockGenerateContent.mockResolvedValue(makeTextResponse('ok'));

      const request = makeRequest({
        history: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello!' },
        ],
        message: 'Thanks',
      });

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, request)) {
        events.push(event);
      }

      const callArgs = mockGenerateContent.mock.calls[0][0];
      const contents = callArgs.contents;
      expect(contents[0].role).toBe('user');
      expect(contents[0].parts[0].text).toBe('Hi');
      expect(contents[1].role).toBe('model');
      expect(contents[1].parts[0].text).toBe('Hello!');
      expect(contents[2].role).toBe('user');
      expect(contents[2].parts[0].text).toBe('Thanks');
    });

    it('executes tool calls via executeToolCall', async () => {
      // First call: model wants to call a tool
      mockGenerateContent
        .mockResolvedValueOnce(makeFunctionCallResponse('getDashboard', {}))
        .mockResolvedValueOnce(makeTextResponse('Here is your dashboard'));

      mockExecuteToolCall.mockResolvedValue({ todayOrders: 5 });

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, makeRequest())) {
        events.push(event);
      }

      expect(mockExecuteToolCall).toHaveBeenCalledWith('getDashboard', {}, STORE_ID);
      expect(events.some((e) => e.type === 'tool_call')).toBe(true);
      expect(events.some((e) => e.type === 'tool_result')).toBe(true);
      expect(events.some((e) => e.type === 'token')).toBe(true);
    });

    it('handles tool call errors gracefully', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeFunctionCallResponse('getDashboard', {}))
        .mockResolvedValueOnce(makeTextResponse('Sorry, something went wrong'));

      mockExecuteToolCall.mockRejectedValue(new Error('DB connection failed'));

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, makeRequest())) {
        events.push(event);
      }

      const toolResultEvent = events.find(
        (e) => e.type === 'tool_result' && e.data['success'] === false,
      );
      expect(toolResultEvent).toBeDefined();
      expect(toolResultEvent!.data['error']).toBe('Data temporarily unavailable');
    });

    it('yields done after exhausting the 5-round function calling loop', async () => {
      // Always return a function call to exhaust the loop
      mockGenerateContent.mockResolvedValue(makeFunctionCallResponse('getDashboard', {}));
      mockExecuteToolCall.mockResolvedValue({ todayOrders: 0 });

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, makeRequest())) {
        events.push(event);
      }

      // 5 rounds x 2 events (tool_call + tool_result) + 1 done
      expect(events[events.length - 1]).toEqual({ type: 'done', data: {} });
      expect(mockGenerateContent).toHaveBeenCalledTimes(5);
    });

    it('handles empty candidates gracefully', async () => {
      mockGenerateContent.mockResolvedValue({ candidates: [] });

      const events = [];
      for await (const event of streamChat(STORE_ID, STORE_NAME, makeRequest())) {
        events.push(event);
      }

      expect(events).toEqual([{ type: 'done', data: {} }]);
    });
  });

  describe('chat', () => {
    it('returns reply and toolCalls from a text-only response', async () => {
      mockGenerateContent.mockResolvedValue(makeTextResponse('Your orders look great'));

      const result = await chat(STORE_ID, STORE_NAME, makeRequest());
      expect(result).toEqual({
        reply: 'Your orders look great',
        toolCalls: [],
      });
    });

    it('collects tool calls in the response', async () => {
      mockGenerateContent
        .mockResolvedValueOnce(makeFunctionCallResponse('getDashboard', {}))
        .mockResolvedValueOnce(makeTextResponse('Dashboard summary'));

      mockExecuteToolCall.mockResolvedValue({ todayOrders: 3 });

      const result = await chat(STORE_ID, STORE_NAME, makeRequest());
      expect(result.reply).toBe('Dashboard summary');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].tool).toBe('getDashboard');
    });
  });
});
