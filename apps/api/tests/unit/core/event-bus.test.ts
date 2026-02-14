import { describe, it, expect, vi } from 'vitest';
import { InMemoryEventBus } from '../../../src/core/events/event-bus.js';
import type { DomainEvent } from '../../../src/core/events/event-bus.js';

describe('InMemoryEventBus', () => {
  function createEvent(name: string, payload: Record<string, unknown> = {}): DomainEvent {
    return { eventName: name, payload, timestamp: new Date() };
  }

  it('should call subscribed handler when event is published', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('test.event', handler);
    const event = createEvent('test.event', { data: 'hello' });
    await bus.publish(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('should call multiple handlers for the same event', async () => {
    const bus = new InMemoryEventBus();
    const handler1 = vi.fn().mockResolvedValue(undefined);
    const handler2 = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('test.event', handler1);
    bus.subscribe('test.event', handler2);
    await bus.publish(createEvent('test.event'));

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it('should not call handlers for different event names', async () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('other.event', handler);
    await bus.publish(createEvent('test.event'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not throw when publishing with no subscribers', async () => {
    const bus = new InMemoryEventBus();
    await expect(bus.publish(createEvent('orphan.event'))).resolves.toBeUndefined();
  });

  it('should continue calling other handlers if one throws', async () => {
    const bus = new InMemoryEventBus();
    const failHandler = vi.fn().mockRejectedValue(new Error('fail'));
    const successHandler = vi.fn().mockResolvedValue(undefined);

    bus.subscribe('test.event', failHandler);
    bus.subscribe('test.event', successHandler);
    await bus.publish(createEvent('test.event'));

    expect(failHandler).toHaveBeenCalledOnce();
    expect(successHandler).toHaveBeenCalledOnce();
  });
});
