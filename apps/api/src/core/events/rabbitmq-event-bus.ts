import amqplib from 'amqplib';
import type { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import type { DomainEvent, EventHandler, EventBus } from './event-bus.js';
import { appLogger } from '../logger/logger.js';
import { env } from '../../config/env.js';

const EXCHANGE = 'mise.events';
const DLX_EXCHANGE = 'mise.events.dlx';
const RETRY_QUEUE = 'mise.retry';
const RETRY_TTL = env.RABBITMQ_RETRY_TTL;
const MAX_RETRIES = env.RABBITMQ_MAX_RETRIES;

export class RabbitMQEventBus implements EventBus {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private handlers = new Map<string, EventHandler[]>();

  constructor(private url: string) {}

  async connect(): Promise<void> {
    this.connection = await amqplib.connect(this.url);
    this.channel = await this.connection.createChannel();

    // Main exchange for domain events
    await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // Dead-letter exchange for failed messages
    await this.channel.assertExchange(DLX_EXCHANGE, 'fanout', { durable: true });

    // Retry queue: messages land here after failure, then re-route back to main exchange after TTL
    await this.channel.assertQueue(RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': RETRY_TTL,
        'x-dead-letter-exchange': EXCHANGE,
      },
    });
    await this.channel.bindQueue(RETRY_QUEUE, DLX_EXCHANGE, '');
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized — call connect() first');
    }

    this.channel.publish(
      EXCHANGE,
      event.eventName,
      Buffer.from(JSON.stringify(event)),
      {
        persistent: true,
        contentType: 'application/json',
      },
    );
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler);
    this.handlers.set(eventName, existing);
  }

  async setupSubscribers(): Promise<void> {
    for (const eventName of this.handlers.keys()) {
      await this.bindQueue(eventName);
    }
  }

  private async bindQueue(eventName: string): Promise<void> {
    if (!this.channel) return;

    const queueName = `mise.${eventName}`;
    await this.channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
      },
    });
    await this.channel.bindQueue(queueName, EXCHANGE, eventName);

    await this.channel.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (!msg || !this.channel) return;

      const retryCount = this.getRetryCount(msg);
      if (retryCount >= MAX_RETRIES) {
        appLogger.error(
          { eventName, message: msg.content.toString() },
          `Message exceeded ${MAX_RETRIES} retries, dropping`,
        );
        this.channel.ack(msg);
        return;
      }

      try {
        const event: DomainEvent = JSON.parse(msg.content.toString());
        event.timestamp = new Date(event.timestamp);

        const handlers = this.handlers.get(eventName) ?? [];
        await Promise.allSettled(handlers.map((h) => h(event)));

        this.channel!.ack(msg);
      } catch (err) {
        appLogger.error({ err, eventName }, 'Error processing message');
        // nack without requeue — sends to DLX, which routes to retry queue
        this.channel.nack(msg, false, false);
      }
    });
  }

  private getRetryCount(msg: ConsumeMessage): number {
    const xDeath = msg.properties.headers?.['x-death'] as Array<{ count: number }> | undefined;
    if (!xDeath || xDeath.length === 0) return 0;
    return xDeath.reduce((total, entry) => total + (entry.count ?? 0), 0);
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      // Ignore close errors during shutdown
    }
    this.channel = null;
    this.connection = null;
  }
}
