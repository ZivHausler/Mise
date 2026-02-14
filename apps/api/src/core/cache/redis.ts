import { env } from '../../config/env.js';

export const redisConfig = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  isHealthy(): Promise<boolean>;
}
