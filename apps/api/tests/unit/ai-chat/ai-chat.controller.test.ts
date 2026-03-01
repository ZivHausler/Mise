import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoreRole } from '../../../src/modules/stores/store.types.js';
import { ForbiddenError, ValidationError } from '../../../src/core/errors/app-error.js';

// Mock the service module
vi.mock('../../../src/modules/ai-chat/ai-chat.service.js', () => ({
  streamChat: vi.fn(),
  chat: vi.fn(),
}));

// Mock the database
vi.mock('../../../src/core/database/postgres.js', () => ({
  getPool: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({ rows: [{ name: 'Test Bakery' }] }),
  }),
}));

// Mock env with GEMINI_API_KEY set
vi.mock('../../../src/config/env.js', () => ({
  env: { GEMINI_API_KEY: 'test-key' },
}));

import { AiChatController } from '../../../src/modules/ai-chat/ai-chat.controller.js';
import { streamChat, chat } from '../../../src/modules/ai-chat/ai-chat.service.js';

function createMockRequest(overrides: Record<string, unknown> = {}): any {
  return {
    currentUser: {
      id: 1,
      storeId: 1,
      storeRole: StoreRole.OWNER,
      isAdmin: false,
    },
    body: {
      message: 'Hello',
      history: [],
      language: 'he',
    },
    log: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  };
}

function createMockReply(): any {
  const reply: any = {};
  reply.send = vi.fn().mockReturnValue(reply);
  reply.status = vi.fn().mockReturnValue(reply);
  reply.hijack = vi.fn().mockResolvedValue(undefined);
  reply.raw = {
    writeHead: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  };
  return reply;
}

describe('AiChatController', () => {
  let controller: AiChatController;
  let reply: any;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AiChatController();
    reply = createMockReply();
  });

  describe('assertOwnerOrAdmin (via stream endpoint)', () => {
    it('allows OWNER role', async () => {
      const req = createMockRequest({
        currentUser: { id: 1, storeId: 1, storeRole: StoreRole.OWNER, isAdmin: false },
      });

      // Mock streamChat to be an empty async generator
      async function* emptyGenerator() {
        // no events
      }
      vi.mocked(streamChat).mockReturnValue(emptyGenerator());

      await expect(controller.stream(req, reply)).resolves.not.toThrow();
    });

    it('allows ADMIN role', async () => {
      const req = createMockRequest({
        currentUser: { id: 1, storeId: 1, storeRole: StoreRole.EMPLOYEE, isAdmin: true },
      });

      async function* emptyGenerator() {}
      vi.mocked(streamChat).mockReturnValue(emptyGenerator());

      await expect(controller.stream(req, reply)).resolves.not.toThrow();
    });

    it('rejects MANAGER role', async () => {
      const req = createMockRequest({
        currentUser: { id: 1, storeId: 1, storeRole: StoreRole.MANAGER, isAdmin: false },
      });

      await expect(controller.stream(req, reply)).rejects.toThrow(ForbiddenError);
    });

    it('rejects EMPLOYEE role', async () => {
      const req = createMockRequest({
        currentUser: { id: 1, storeId: 1, storeRole: StoreRole.EMPLOYEE, isAdmin: false },
      });

      await expect(controller.stream(req, reply)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('stream', () => {
    it('sets correct SSE headers', async () => {
      const req = createMockRequest();

      async function* emptyGenerator() {}
      vi.mocked(streamChat).mockReturnValue(emptyGenerator());

      await controller.stream(req, reply);

      expect(reply.hijack).toHaveBeenCalled();
      expect(reply.raw.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
    });

    it('writes SSE data lines for stream events', async () => {
      const req = createMockRequest();

      async function* generator() {
        yield { type: 'token' as const, data: { text: 'Hi' } };
        yield { type: 'done' as const, data: {} };
      }
      vi.mocked(streamChat).mockReturnValue(generator() as any);

      await controller.stream(req, reply);

      // Initial :ok heartbeat + 2 events
      expect(reply.raw.write).toHaveBeenCalledWith(':ok\n\n');
      expect(reply.raw.write).toHaveBeenCalledWith(
        `event: token\ndata: ${JSON.stringify({ text: 'Hi' })}\n\n`,
      );
      expect(reply.raw.write).toHaveBeenCalledWith(
        `event: done\ndata: ${JSON.stringify({})}\n\n`,
      );
      expect(reply.raw.end).toHaveBeenCalled();
    });

    it('returns validation error for invalid request body', async () => {
      const req = createMockRequest({ body: { message: '' } });

      await expect(controller.stream(req, reply)).rejects.toThrow(ValidationError);
    });

    it('writes error event when streamChat throws', async () => {
      const req = createMockRequest();

      async function* failingGenerator(): AsyncGenerator<any> {
        throw new Error('Gemini is down');
      }
      vi.mocked(streamChat).mockReturnValue(failingGenerator());

      await controller.stream(req, reply);

      const errorWrite = reply.raw.write.mock.calls.find((call: any[]) => {
        const arg = call[0] as string;
        return arg.includes('event: error');
      });
      expect(errorWrite).toBeDefined();
      expect(reply.raw.end).toHaveBeenCalled();
    });
  });

  describe('message', () => {
    it('returns chat result on success', async () => {
      const req = createMockRequest();
      const chatResult = { reply: 'Hello!', toolCalls: [] };
      vi.mocked(chat).mockResolvedValue(chatResult);

      await controller.message(req, reply);

      expect(reply.send).toHaveBeenCalledWith({ success: true, data: chatResult });
    });

    it('rejects MANAGER role', async () => {
      const req = createMockRequest({
        currentUser: { id: 1, storeId: 1, storeRole: StoreRole.MANAGER, isAdmin: false },
      });

      await expect(controller.message(req, reply)).rejects.toThrow(ForbiddenError);
    });

    it('returns validation error for invalid body', async () => {
      const req = createMockRequest({ body: { message: 'x'.repeat(2001) } });

      await expect(controller.message(req, reply)).rejects.toThrow(ValidationError);
    });
  });
});
