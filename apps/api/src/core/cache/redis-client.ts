import Redis from 'ioredis';
import { redisConfig } from './redis.js';
import type { CacheClient } from './redis.js';

export class RedisCacheClient implements CacheClient {
  private client: Redis;

  constructor() {
    this.client = new Redis(redisConfig.url, {
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      retryStrategy: redisConfig.retryStrategy,
    });
  }

  async connect(): Promise<void> {
    // ioredis connects automatically, but we wait for the ready event
    if (this.client.status === 'ready') return;
    await new Promise<void>((resolve, reject) => {
      this.client.once('ready', resolve);
      this.client.once('error', reject);
    });
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
