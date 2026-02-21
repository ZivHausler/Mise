import pg from 'pg';
import { env } from '../../config/env.js';

const { Pool } = pg;

export const postgresConfig = {
  connectionString: env.DATABASE_URL,
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
};

export interface PostgresClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  query<T extends pg.QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<pg.QueryResult<T>>;
}

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: postgresConfig.connectionString,
      min: postgresConfig.pool.min,
      max: postgresConfig.pool.max,
      idleTimeoutMillis: postgresConfig.pool.idleTimeoutMillis,
      connectionTimeoutMillis: postgresConfig.pool.connectionTimeoutMillis,
      ...(env.NODE_ENV === 'production' && !postgresConfig.connectionString.includes('/cloudsql/') ? { ssl: { rejectUnauthorized: true } } : {}),
    });
  }
  return pool;
}

export const postgresClient: PostgresClient = {
  async connect() {
    const p = getPool();
    await p.query('SELECT 1');
  },
  async disconnect() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
  async isHealthy() {
    try {
      const p = getPool();
      await p.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  },
  async query<T extends pg.QueryResultRow = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) {
    const p = getPool();
    return p.query<T>(text, params);
  },
};
