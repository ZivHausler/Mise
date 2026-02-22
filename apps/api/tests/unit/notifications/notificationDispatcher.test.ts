import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationDispatcher } from '../../../src/modules/notifications/notification.dispatcher.js';
import type { DomainEvent } from '../../../src/core/events/event-bus.js';

vi.mock('../../../src/modules/settings/notifications/notifications.repository.js', () => ({
  PgNotifPrefsRepository: {
    findByEventType: vi.fn(),
  },
}));

vi.mock('../../../src/core/events/event-names.js', () => ({
  EventNames: {
    ORDER_CREATED: 'order.created',
    INVENTORY_LOW_STOCK: 'inventory.lowStock',
    PAYMENT_RECEIVED: 'payment.received',
  },
}));

import { PgNotifPrefsRepository } from '../../../src/modules/settings/notifications/notifications.repository.js';

describe('NotificationDispatcher', () => {
  let dispatcher: NotificationDispatcher;
  let mockEmailNotifier: any;
  let mockSmsNotifier: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailNotifier = { send: vi.fn().mockResolvedValue(undefined), sendBatch: vi.fn().mockResolvedValue(undefined) };
    mockSmsNotifier = { send: vi.fn().mockResolvedValue(undefined), sendBatch: vi.fn().mockResolvedValue(undefined) };
    mockLogger = { warn: vi.fn(), info: vi.fn() };
    dispatcher = new NotificationDispatcher(mockEmailNotifier, mockSmsNotifier, mockLogger);
  });

  it('should send email notification when channelEmail is true', async () => {
    vi.mocked(PgNotifPrefsRepository.findByEventType).mockResolvedValue([
      { userId: 'u1', name: 'User', email: 'u@test.com', phone: null, language: 0, channelEmail: true, channelSms: false },
    ]);

    const event: DomainEvent = { eventName: 'order.created', payload: { orderId: 1 }, timestamp: new Date() };
    await dispatcher.dispatch(event);

    expect(mockEmailNotifier.sendBatch).toHaveBeenCalledOnce();
    expect(mockEmailNotifier.sendBatch).toHaveBeenCalledWith(
      [{ userId: 'u1', name: 'User', email: 'u@test.com', phone: null, language: 0 }],
      expect.objectContaining({ eventType: 'order_created' }),
    );
    expect(mockSmsNotifier.sendBatch).not.toHaveBeenCalled();
  });

  it('should send sms notification when channelSms is true and phone exists', async () => {
    vi.mocked(PgNotifPrefsRepository.findByEventType).mockResolvedValue([
      { userId: 'u1', name: 'User', email: 'u@test.com', phone: '054-1234567', language: 0, channelEmail: false, channelSms: true },
    ]);

    const event: DomainEvent = { eventName: 'order.created', payload: { orderId: 1 }, timestamp: new Date() };
    await dispatcher.dispatch(event);

    expect(mockSmsNotifier.sendBatch).toHaveBeenCalledOnce();
    expect(mockSmsNotifier.sendBatch).toHaveBeenCalledWith(
      [{ userId: 'u1', name: 'User', email: 'u@test.com', phone: '054-1234567', language: 0 }],
      expect.objectContaining({ eventType: 'order_created' }),
    );
    expect(mockEmailNotifier.sendBatch).not.toHaveBeenCalled();
  });

  it('should not send sms when channelSms is true but no phone', async () => {
    vi.mocked(PgNotifPrefsRepository.findByEventType).mockResolvedValue([
      { userId: 'u1', name: 'User', email: 'u@test.com', phone: null, language: 0, channelEmail: false, channelSms: true },
    ]);

    const event: DomainEvent = { eventName: 'order.created', payload: {}, timestamp: new Date() };
    await dispatcher.dispatch(event);

    expect(mockSmsNotifier.sendBatch).not.toHaveBeenCalled();
  });

  it('should send both email and sms when both channels are enabled', async () => {
    vi.mocked(PgNotifPrefsRepository.findByEventType).mockResolvedValue([
      { userId: 'u1', name: 'User', email: 'u@test.com', phone: '054-1234567', language: 0, channelEmail: true, channelSms: true },
    ]);

    const event: DomainEvent = { eventName: 'payment.received', payload: {}, timestamp: new Date() };
    await dispatcher.dispatch(event);

    expect(mockEmailNotifier.sendBatch).toHaveBeenCalledOnce();
    expect(mockSmsNotifier.sendBatch).toHaveBeenCalledOnce();
  });

  it('should log warning for unmapped event names', async () => {
    const event: DomainEvent = { eventName: 'unknown.event', payload: {}, timestamp: new Date() };
    await dispatcher.dispatch(event);

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(PgNotifPrefsRepository.findByEventType).not.toHaveBeenCalled();
  });

  it('should dispatch to multiple recipients', async () => {
    vi.mocked(PgNotifPrefsRepository.findByEventType).mockResolvedValue([
      { userId: 'u1', name: 'User1', email: 'u1@test.com', phone: null, language: 0, channelEmail: true, channelSms: false },
      { userId: 'u2', name: 'User2', email: 'u2@test.com', phone: '054-0000000', language: 1, channelEmail: true, channelSms: true },
    ]);

    const event: DomainEvent = { eventName: 'order.created', payload: {}, timestamp: new Date() };
    await dispatcher.dispatch(event);

    expect(mockEmailNotifier.sendBatch).toHaveBeenCalledOnce();
    expect(mockEmailNotifier.sendBatch).toHaveBeenCalledWith(
      [
        { userId: 'u1', name: 'User1', email: 'u1@test.com', phone: null, language: 0 },
        { userId: 'u2', name: 'User2', email: 'u2@test.com', phone: '054-0000000', language: 1 },
      ],
      expect.objectContaining({ eventType: 'order_created' }),
    );
    expect(mockSmsNotifier.sendBatch).toHaveBeenCalledOnce();
    expect(mockSmsNotifier.sendBatch).toHaveBeenCalledWith(
      [{ userId: 'u2', name: 'User2', email: 'u2@test.com', phone: '054-0000000', language: 1 }],
      expect.objectContaining({ eventType: 'order_created' }),
    );
  });
});
