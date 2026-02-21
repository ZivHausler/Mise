import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Fastify types locally since we only need the raw.write interface
function createMockReply() {
  return {
    raw: {
      write: vi.fn(),
    },
  } as any;
}

// Import the module under test — sseManager is a singleton
import { sseManager } from '../../../src/core/sse/sse-manager.js';

describe('SSEManager', () => {
  beforeEach(() => {
    // Reset internal state by removing all possible clients
    // Since it's a singleton, we clean up after each test
  });

  describe('broadcast', () => {
    it('should send SSE-formatted message to all store clients', () => {
      const reply1 = createMockReply();
      const reply2 = createMockReply();

      sseManager.addClient('store-1', reply1);
      sseManager.addClient('store-1', reply2);

      sseManager.broadcast('store-1', 'order.created', { id: 'o1' });

      const expected = 'event: order.created\ndata: {"id":"o1"}\n\n';
      expect(reply1.raw.write).toHaveBeenCalledWith(expected);
      expect(reply2.raw.write).toHaveBeenCalledWith(expected);

      // cleanup
      sseManager.removeClient('store-1', reply1);
      sseManager.removeClient('store-1', reply2);
    });

    it('should not send to clients of a different store', () => {
      const reply1 = createMockReply();
      const reply2 = createMockReply();

      sseManager.addClient('store-1', reply1);
      sseManager.addClient('store-2', reply2);

      sseManager.broadcast('store-1', 'test', {});

      expect(reply1.raw.write).toHaveBeenCalledOnce();
      expect(reply2.raw.write).not.toHaveBeenCalled();

      // cleanup
      sseManager.removeClient('store-1', reply1);
      sseManager.removeClient('store-2', reply2);
    });

    it('should be a no-op when store has no clients', () => {
      // Should not throw
      expect(() => sseManager.broadcast('nonexistent', 'test', {})).not.toThrow();
    });

    it('should handle client write errors gracefully', () => {
      const reply = createMockReply();
      reply.raw.write.mockImplementation(() => { throw new Error('broken pipe'); });

      sseManager.addClient('store-1', reply);

      // Should not throw even though write fails
      expect(() => sseManager.broadcast('store-1', 'test', {})).not.toThrow();

      // cleanup
      sseManager.removeClient('store-1', reply);
    });
  });

  describe('removeClient', () => {
    it('should remove a specific client', () => {
      const reply1 = createMockReply();
      const reply2 = createMockReply();

      sseManager.addClient('store-1', reply1);
      sseManager.addClient('store-1', reply2);

      sseManager.removeClient('store-1', reply1);

      sseManager.broadcast('store-1', 'test', {});

      expect(reply1.raw.write).not.toHaveBeenCalled();
      expect(reply2.raw.write).toHaveBeenCalledOnce();

      // cleanup
      sseManager.removeClient('store-1', reply2);
    });

    it('should clean up store entry when last client is removed', () => {
      const reply = createMockReply();

      sseManager.addClient('store-1', reply);
      sseManager.removeClient('store-1', reply);

      // After removing the last client, broadcast should be a no-op
      sseManager.broadcast('store-1', 'test', {});
      expect(reply.raw.write).not.toHaveBeenCalled();
    });

    it('should be a no-op for non-existent store', () => {
      const reply = createMockReply();
      expect(() => sseManager.removeClient('nonexistent', reply)).not.toThrow();
    });
  });
});
