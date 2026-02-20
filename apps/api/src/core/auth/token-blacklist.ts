import type { CacheClient } from '../cache/redis.js';

const BLACKLIST_PREFIX = 'token:blacklist:';

let cacheClient: CacheClient | null = null;

export function setTokenBlacklistClient(client: CacheClient | null): void {
  cacheClient = client;
}

export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  if (!cacheClient) return;
  await cacheClient.set(`${BLACKLIST_PREFIX}${jti}`, '1', ttlSeconds);
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  if (!cacheClient) return false;
  const result = await cacheClient.get(`${BLACKLIST_PREFIX}${jti}`);
  return result !== null;
}
