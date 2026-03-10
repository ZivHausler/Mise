import { getPool } from '../../core/database/postgres.js';
import type pg from 'pg';

type Queryable = pg.Pool | pg.PoolClient;

export interface CheckoutSession {
  id: string;
  storeId: number;
  action: 'upgrade' | 'renewal_recovery' | 'payment_method_update';
  targetPlanId: number | null;
  fromPlanId: number | null;
  amountAgorot: number;
  isProration: boolean;
  prorationDays: number | null;
  periodDays: number | null;
  provider: 'payplus' | 'paypal';
  providerPageUrl: string | null;
  providerSessionId: string | null;
  status: 'pending' | 'completed' | 'failed' | 'expired' | 'canceled';
  actorUserId: number;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface CreateCheckoutSessionInput {
  storeId: number;
  action: 'upgrade' | 'renewal_recovery' | 'payment_method_update';
  targetPlanId: number | null;
  fromPlanId: number | null;
  amountAgorot: number;
  isProration: boolean;
  prorationDays?: number | null;
  periodDays?: number | null;
  provider: 'payplus' | 'paypal';
  actorUserId: number;
}

export class CheckoutRepository {
  private getQueryable(client?: pg.PoolClient): Queryable {
    return client ?? getPool();
  }

  async create(input: CreateCheckoutSessionInput, client?: pg.PoolClient): Promise<string> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `INSERT INTO checkout_sessions
        (store_id, action, target_plan_id, from_plan_id, amount_agorot, is_proration,
         proration_days, period_days, provider, actor_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        input.storeId,
        input.action,
        input.targetPlanId,
        input.fromPlanId,
        input.amountAgorot,
        input.isProration,
        input.prorationDays ?? null,
        input.periodDays ?? null,
        input.provider,
        input.actorUserId,
      ],
    );
    return result.rows[0].id as string;
  }

  async getById(id: string, client?: pg.PoolClient): Promise<CheckoutSession | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT * FROM checkout_sessions WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getByProviderSessionId(providerSessionId: string, client?: pg.PoolClient): Promise<CheckoutSession | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT * FROM checkout_sessions WHERE provider_session_id = $1`,
      [providerSessionId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async updateStatus(id: string, status: CheckoutSession['status'], completedAt?: Date, client?: pg.PoolClient): Promise<void> {
    const q = this.getQueryable(client);
    if (completedAt) {
      await q.query(
        `UPDATE checkout_sessions SET status = $1, completed_at = $2 WHERE id = $3`,
        [status, completedAt, id],
      );
    } else {
      await q.query(
        `UPDATE checkout_sessions SET status = $1 WHERE id = $2`,
        [status, id],
      );
    }
  }

  async updateProviderInfo(id: string, providerPageUrl: string, providerSessionId: string, client?: pg.PoolClient): Promise<void> {
    const q = this.getQueryable(client);
    await q.query(
      `UPDATE checkout_sessions SET provider_page_url = $1, provider_session_id = $2 WHERE id = $3`,
      [providerPageUrl, providerSessionId, id],
    );
  }

  async getPendingByStoreId(storeId: number, client?: pg.PoolClient): Promise<CheckoutSession | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT * FROM checkout_sessions
       WHERE store_id = $1 AND status = 'pending' AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [storeId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getRecentlyCompletedByStoreId(storeId: number, windowMinutes = 2): Promise<CheckoutSession | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM checkout_sessions
       WHERE store_id = $1 AND status = 'completed'
         AND completed_at > NOW() - INTERVAL '1 minute' * $2
       ORDER BY completed_at DESC
       LIMIT 1`,
      [storeId, windowMinutes],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async cancelPendingByStoreId(storeId: number, client?: pg.PoolClient): Promise<number> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `UPDATE checkout_sessions SET status = 'canceled'
       WHERE store_id = $1 AND status = 'pending'
       RETURNING id`,
      [storeId],
    );
    return result.rowCount ?? 0;
  }

  async expireStale(client?: pg.PoolClient): Promise<number> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `UPDATE checkout_sessions SET status = 'expired'
       WHERE status = 'pending' AND expires_at < NOW()
       RETURNING id`,
    );
    return result.rowCount ?? 0;
  }
}

function mapRow(row: Record<string, unknown>): CheckoutSession {
  return {
    id: row['id'] as string,
    storeId: row['store_id'] as number,
    action: row['action'] as CheckoutSession['action'],
    targetPlanId: (row['target_plan_id'] as number) ?? null,
    fromPlanId: (row['from_plan_id'] as number) ?? null,
    amountAgorot: row['amount_agorot'] as number,
    isProration: row['is_proration'] as boolean,
    prorationDays: (row['proration_days'] as number) ?? null,
    periodDays: (row['period_days'] as number) ?? null,
    provider: row['provider'] as CheckoutSession['provider'],
    providerPageUrl: (row['provider_page_url'] as string) ?? null,
    providerSessionId: (row['provider_session_id'] as string) ?? null,
    status: row['status'] as CheckoutSession['status'],
    actorUserId: row['actor_user_id'] as number,
    expiresAt: (row['expires_at'] as Date).toISOString(),
    completedAt: row['completed_at'] ? (row['completed_at'] as Date).toISOString() : null,
    createdAt: (row['created_at'] as Date).toISOString(),
  };
}
