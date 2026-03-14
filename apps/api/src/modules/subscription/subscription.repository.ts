import { getPool } from '../../core/database/postgres.js';
import type pg from 'pg';
import type { Plan, PlanSlug, StoreSubscription, SubscriptionEvent, SubscriptionEventType, SubscriptionStatus, SubscriptionPayment } from './subscription.types.js';
import { PaymentType, PaymentStatus } from './subscription.types.js';

type Queryable = pg.Pool | pg.PoolClient;

export class SubscriptionRepository {
  private getQueryable(client?: pg.PoolClient): Queryable {
    return client ?? getPool();
  }

  async getPlans(): Promise<Plan[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, slug, name, price_nis, features, sort_order, is_active
       FROM plans
       WHERE is_active = true AND slug != 'trial'
       ORDER BY sort_order ASC`,
    );
    return result.rows.map(mapPlanRow);
  }

  async getPlanBySlug(slug: PlanSlug, client?: pg.PoolClient): Promise<Plan | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT id, slug, name, price_nis, features, sort_order, is_active
       FROM plans
       WHERE slug = $1`,
      [slug],
    );
    return result.rows[0] ? mapPlanRow(result.rows[0]) : null;
  }

  async getPlanById(id: number, client?: pg.PoolClient): Promise<Plan | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT id, slug, name, price_nis, features, sort_order, is_active
       FROM plans
       WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapPlanRow(result.rows[0]) : null;
  }

  async getActiveSubscription(storeId: number, client?: pg.PoolClient): Promise<StoreSubscription | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT
        ss.id,
        ss.store_id,
        ss.plan_id,
        p.slug AS plan_slug,
        p.name AS plan_name,
        p.price_nis,
        ss.status,
        ss.trial_ends_at,
        ss.current_period_start,
        ss.current_period_end,
        ss.cancel_at_period_end,
        ss.billing_anchor_day,
        dp.slug AS downgrade_to_slug,
        p.features,
        ss.payment_provider,
        ss.provider_subscription_id,
        ss.grace_period_end,
        ss.payment_failed_count
       FROM store_subscriptions ss
       JOIN plans p ON p.id = ss.plan_id
       LEFT JOIN plans dp ON dp.id = ss.downgrade_to_plan_id
       WHERE ss.store_id = $1 AND ss.status IN ('active', 'trialing', 'past_due')
       ORDER BY ss.created_at DESC
       LIMIT 1`,
      [storeId],
    );
    return result.rows[0] ? mapSubscriptionRow(result.rows[0]) : null;
  }

  async getActiveSubscriptionForUpdate(storeId: number, client: pg.PoolClient): Promise<StoreSubscription | null> {
    const result = await client.query(
      `SELECT
        ss.id,
        ss.store_id,
        ss.plan_id,
        p.slug AS plan_slug,
        p.name AS plan_name,
        p.price_nis,
        ss.status,
        ss.trial_ends_at,
        ss.current_period_start,
        ss.current_period_end,
        ss.cancel_at_period_end,
        ss.billing_anchor_day,
        dp.slug AS downgrade_to_slug,
        p.features
       FROM store_subscriptions ss
       JOIN plans p ON p.id = ss.plan_id
       LEFT JOIN plans dp ON dp.id = ss.downgrade_to_plan_id
       WHERE ss.store_id = $1 AND ss.status IN ('active', 'trialing')
       ORDER BY ss.created_at DESC
       LIMIT 1
       FOR UPDATE OF ss`,
      [storeId],
    );
    return result.rows[0] ? mapSubscriptionRow(result.rows[0]) : null;
  }

  async createSubscription(
    storeId: number,
    planId: number,
    status: SubscriptionStatus,
    trialEndsAt?: Date,
    client?: pg.PoolClient,
  ): Promise<{ id: number }> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `INSERT INTO store_subscriptions (store_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, NOW(), COALESCE($4, NOW() + INTERVAL '30 days'))
       RETURNING id`,
      [storeId, planId, status, trialEndsAt || null],
    );
    return { id: result.rows[0].id };
  }

  async updateSubscription(
    id: number,
    updates: {
      status?: SubscriptionStatus;
      planId?: number;
      cancelAtPeriodEnd?: boolean;
      downgradeToPlanId?: number | null;
      billingAnchorDay?: number;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      paymentProvider?: 'payplus' | 'paypal' | null;
      providerSubscriptionId?: string | null;
      gracePeriodEnd?: Date | null;
      paymentFailedCount?: number;
    },
    client?: pg.PoolClient,
  ): Promise<void> {
    const q = this.getQueryable(client);
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.planId !== undefined) {
      setClauses.push(`plan_id = $${paramIndex++}`);
      values.push(updates.planId);
    }
    if (updates.cancelAtPeriodEnd !== undefined) {
      setClauses.push(`cancel_at_period_end = $${paramIndex++}`);
      values.push(updates.cancelAtPeriodEnd);
    }
    if (updates.downgradeToPlanId !== undefined) {
      setClauses.push(`downgrade_to_plan_id = $${paramIndex++}`);
      values.push(updates.downgradeToPlanId);
    }
    if (updates.billingAnchorDay !== undefined) {
      setClauses.push(`billing_anchor_day = $${paramIndex++}`);
      values.push(updates.billingAnchorDay);
    }
    if (updates.currentPeriodStart !== undefined) {
      setClauses.push(`current_period_start = $${paramIndex++}`);
      values.push(updates.currentPeriodStart);
    }
    if (updates.currentPeriodEnd !== undefined) {
      setClauses.push(`current_period_end = $${paramIndex++}`);
      values.push(updates.currentPeriodEnd);
    }
    if (updates.paymentProvider !== undefined) {
      setClauses.push(`payment_provider = $${paramIndex++}`);
      values.push(updates.paymentProvider);
    }
    if (updates.providerSubscriptionId !== undefined) {
      setClauses.push(`provider_subscription_id = $${paramIndex++}`);
      values.push(updates.providerSubscriptionId);
    }
    if (updates.gracePeriodEnd !== undefined) {
      setClauses.push(`grace_period_end = $${paramIndex++}`);
      values.push(updates.gracePeriodEnd);
    }
    if (updates.paymentFailedCount !== undefined) {
      setClauses.push(`payment_failed_count = $${paramIndex++}`);
      values.push(updates.paymentFailedCount);
    }

    values.push(id);
    await q.query(
      `UPDATE store_subscriptions SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );
  }

  async expireSubscription(id: number, client?: pg.PoolClient): Promise<void> {
    const q = this.getQueryable(client);
    await q.query(
      `UPDATE store_subscriptions SET status = 'expired', updated_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  async logEvent(
    storeId: number,
    subscriptionId: number | null,
    eventType: SubscriptionEventType,
    fromPlanId?: number | null,
    toPlanId?: number | null,
    metadata?: Record<string, unknown>,
    client?: pg.PoolClient,
  ): Promise<void> {
    const q = this.getQueryable(client);
    await q.query(
      `INSERT INTO subscription_events (store_id, subscription_id, event_type, from_plan_id, to_plan_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [storeId, subscriptionId, eventType, fromPlanId || null, toPlanId || null, JSON.stringify(metadata || {})],
    );
  }

  async createPayment(
    data: {
      storeId: number;
      subscriptionId: number;
      amountAgorot: number;
      type: PaymentType;
      description?: string;
      fromPlanId?: number | null;
      toPlanId?: number | null;
      prorationDays?: number | null;
      periodDays?: number | null;
      status?: PaymentStatus;
      externalRef?: string | null;
      checkoutSessionId?: string | null;
      providerTransactionId?: string | null;
    },
    client?: pg.PoolClient,
  ): Promise<{ id: number }> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `INSERT INTO subscription_payments
        (store_id, subscription_id, amount_agorot, type, description, from_plan_id, to_plan_id, proration_days, period_days, status, external_ref, checkout_session_id, provider_transaction_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        data.storeId,
        data.subscriptionId,
        data.amountAgorot,
        data.type,
        data.description ?? null,
        data.fromPlanId ?? null,
        data.toPlanId ?? null,
        data.prorationDays ?? null,
        data.periodDays ?? null,
        data.status ?? PaymentStatus.SUCCEEDED,
        data.externalRef ?? null,
        data.checkoutSessionId ?? null,
        data.providerTransactionId ?? null,
      ],
    );
    return { id: result.rows[0].id };
  }

  async getPayments(storeId: number, limit = 20, offset = 0): Promise<SubscriptionPayment[]> {
    const pool = getPool();
    const boundedLimit = Math.min(limit, 100);
    const result = await pool.query(
      `SELECT id, store_id, subscription_id, amount_agorot, type, description,
              from_plan_id, to_plan_id, proration_days, period_days, status, external_ref, created_at
       FROM subscription_payments
       WHERE store_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [storeId, boundedLimit, offset],
    );
    return result.rows.map(mapPaymentRow);
  }

  async getPaymentCount(storeId: number): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM subscription_payments WHERE store_id = $1`,
      [storeId],
    );
    return result.rows[0].count;
  }

  async getByProviderSubscriptionId(providerSubscriptionId: string, client?: pg.PoolClient): Promise<StoreSubscription | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT
        ss.id, ss.store_id, ss.plan_id, p.slug AS plan_slug, p.name AS plan_name,
        p.price_nis, ss.status, ss.trial_ends_at, ss.current_period_start, ss.current_period_end,
        ss.cancel_at_period_end, ss.billing_anchor_day, dp.slug AS downgrade_to_slug, p.features,
        ss.payment_provider, ss.provider_subscription_id, ss.grace_period_end, ss.payment_failed_count
       FROM store_subscriptions ss
       JOIN plans p ON p.id = ss.plan_id
       LEFT JOIN plans dp ON dp.id = ss.downgrade_to_plan_id
       WHERE ss.provider_subscription_id = $1 AND ss.status IN ('active', 'past_due')
       ORDER BY ss.created_at DESC
       LIMIT 1`,
      [providerSubscriptionId],
    );
    return result.rows[0] ? mapSubscriptionRow(result.rows[0]) : null;
  }

  async getExpiredGracePeriods(limit: number, client?: pg.PoolClient): Promise<StoreSubscription[]> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT
        ss.id, ss.store_id, ss.plan_id, p.slug AS plan_slug, p.name AS plan_name,
        p.price_nis, ss.status, ss.trial_ends_at, ss.current_period_start, ss.current_period_end,
        ss.cancel_at_period_end, ss.billing_anchor_day, dp.slug AS downgrade_to_slug, p.features,
        ss.payment_provider, ss.provider_subscription_id, ss.grace_period_end, ss.payment_failed_count
       FROM store_subscriptions ss
       JOIN plans p ON p.id = ss.plan_id
       LEFT JOIN plans dp ON dp.id = ss.downgrade_to_plan_id
       WHERE ss.status = 'past_due'
         AND ss.grace_period_end IS NOT NULL
         AND ss.grace_period_end < NOW()
       ORDER BY ss.grace_period_end ASC
       LIMIT $1
       FOR UPDATE OF ss SKIP LOCKED`,
      [limit],
    );
    return result.rows.map((row: Record<string, unknown>) => mapSubscriptionRow(row));
  }

  async getExpiredSubscriptions(limit: number, client: pg.PoolClient): Promise<StoreSubscription[]> {
    const result = await client.query(
      `SELECT
        ss.id,
        ss.store_id,
        ss.plan_id,
        p.slug AS plan_slug,
        p.name AS plan_name,
        p.price_nis,
        ss.status,
        ss.trial_ends_at,
        ss.current_period_start,
        ss.current_period_end,
        ss.cancel_at_period_end,
        ss.billing_anchor_day,
        dp.slug AS downgrade_to_slug
       FROM store_subscriptions ss
       JOIN plans p ON p.id = ss.plan_id
       LEFT JOIN plans dp ON dp.id = ss.downgrade_to_plan_id
       WHERE ss.status = 'active'
         AND p.slug != 'free'
         AND ss.current_period_end <= NOW()
       ORDER BY ss.current_period_end ASC
       LIMIT $1
       FOR UPDATE OF ss SKIP LOCKED`,
      [limit],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      ...mapSubscriptionRow(row),
      // expired subs won't have features in the query above, default to empty
      features: (row['features'] as string[] | undefined) ?? [],
    }));
  }

  async getDowngradeToPlanId(subscriptionId: number, client?: pg.PoolClient): Promise<number | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT downgrade_to_plan_id FROM store_subscriptions WHERE id = $1`,
      [subscriptionId],
    );
    return result.rows[0]?.downgrade_to_plan_id ?? null;
  }

  /**
   * Find the most recent successful payment of a given type for a subscription.
   * Used to retrieve the upgrade-difference payment for trial plan switching.
   */
  async getMostRecentPayment(
    subscriptionId: number,
    type: PaymentType,
    client?: pg.PoolClient,
  ): Promise<{ id: number; amountAgorot: number; providerTransactionId: string | null; toPlanId: number | null } | null> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT id, amount_agorot, provider_transaction_id, to_plan_id
       FROM subscription_payments
       WHERE subscription_id = $1 AND type = $2 AND status = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [subscriptionId, type, PaymentStatus.SUCCEEDED],
    );
    if (!result.rows[0]) return null;
    return {
      id: result.rows[0].id as number,
      amountAgorot: result.rows[0].amount_agorot as number,
      providerTransactionId: result.rows[0].provider_transaction_id as string | null,
      toPlanId: result.rows[0].to_plan_id as number | null,
    };
  }

  /**
   * Calculate net amount paid for a trial subscription (total paid - total refunded)
   * and collect all PayPal subscription IDs from payment records.
   */
  async getTrialPaymentSummary(subscriptionId: number, client?: pg.PoolClient): Promise<{ netPaidAgorot: number; paypalSubscriptionIds: string[] }> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT amount_agorot, type, provider_transaction_id
       FROM subscription_payments
       WHERE subscription_id = $1 AND status = $2`,
      [subscriptionId, PaymentStatus.SUCCEEDED],
    );

    let totalPaid = 0;
    let totalRefunded = 0;
    const paypalSubIds: string[] = [];

    for (const row of result.rows) {
      const amount = Number(row.amount_agorot);
      const type = Number(row.type);
      if (type === PaymentType.REFUND) {
        totalRefunded += amount;
      } else {
        totalPaid += amount;
      }
      const txId = row.provider_transaction_id as string | null;
      if (txId && !paypalSubIds.includes(txId)) {
        paypalSubIds.push(txId);
      }
    }

    return { netPaidAgorot: totalPaid - totalRefunded, paypalSubscriptionIds: paypalSubIds };
  }

  async getEvents(storeId: number, limit = 50, offset = 0): Promise<SubscriptionEvent[]> {
    const pool = getPool();
    const boundedLimit = Math.min(limit, 100);
    const result = await pool.query(
      `SELECT id, store_id, subscription_id, event_type, from_plan_id, to_plan_id, metadata, created_at
       FROM subscription_events
       WHERE store_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [storeId, boundedLimit, offset],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: row['id'] as number,
      storeId: row['store_id'] as number,
      subscriptionId: row['subscription_id'] as number | null,
      eventType: row['event_type'] as SubscriptionEventType,
      fromPlanId: row['from_plan_id'] as number | null,
      toPlanId: row['to_plan_id'] as number | null,
      metadata: (row['metadata'] || {}) as Record<string, unknown>,
      createdAt: (row['created_at'] as Date).toISOString(),
    }));
  }

  /**
   * Find trialing subscriptions whose trial_ends_at falls on the target date (UTC day).
   */
  async getTrialingSubscriptionsByTrialEndDate(
    targetDate: Date,
    client?: pg.PoolClient,
  ): Promise<{ subscriptionId: number; storeId: number; trialEndsAt: string; planName: string }[]> {
    const q = this.getQueryable(client);
    const dateStr = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const result = await q.query(
      `SELECT ss.id AS subscription_id, ss.store_id, ss.trial_ends_at,
              p.name AS plan_name
       FROM store_subscriptions ss
       JOIN plans p ON p.id = ss.plan_id
       WHERE ss.status = 'trialing'
         AND ss.trial_ends_at IS NOT NULL
         AND DATE(ss.trial_ends_at AT TIME ZONE 'UTC') = $1`,
      [dateStr],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      subscriptionId: row['subscription_id'] as number,
      storeId: row['store_id'] as number,
      trialEndsAt: (row['trial_ends_at'] as Date).toISOString(),
      planName: row['plan_name'] as string,
    }));
  }

  /**
   * Check whether a specific event type has already been logged for a subscription.
   */
  async hasEvent(
    subscriptionId: number,
    eventType: SubscriptionEventType,
    client?: pg.PoolClient,
  ): Promise<boolean> {
    const q = this.getQueryable(client);
    const result = await q.query(
      `SELECT 1 FROM subscription_events
       WHERE subscription_id = $1 AND event_type = $2
       LIMIT 1`,
      [subscriptionId, eventType],
    );
    return result.rows.length > 0;
  }
}

function mapPlanRow(row: Record<string, unknown>): Plan {
  return {
    id: row['id'] as number,
    slug: row['slug'] as PlanSlug,
    name: row['name'] as string,
    priceNis: row['price_nis'] as number,
    features: row['features'] as string[],
    sortOrder: row['sort_order'] as number,
    isActive: row['is_active'] as boolean,
  };
}

function mapSubscriptionRow(row: Record<string, unknown>): StoreSubscription {
  return {
    id: row['id'] as number,
    storeId: row['store_id'] as number,
    planId: row['plan_id'] as number,
    planSlug: row['plan_slug'] as PlanSlug,
    planName: row['plan_name'] as string,
    priceNis: row['price_nis'] as number,
    status: row['status'] as StoreSubscription['status'],
    trialEndsAt: row['trial_ends_at'] ? (row['trial_ends_at'] as Date).toISOString() : null,
    currentPeriodStart: (row['current_period_start'] as Date).toISOString(),
    currentPeriodEnd: (row['current_period_end'] as Date).toISOString(),
    cancelAtPeriodEnd: row['cancel_at_period_end'] as boolean,
    downgradeToSlug: (row['downgrade_to_slug'] as PlanSlug) || null,
    billingAnchorDay: (row['billing_anchor_day'] as number) ?? null,
    features: row['features'] as string[],
    paymentProvider: (row['payment_provider'] as StoreSubscription['paymentProvider']) ?? null,
    providerSubscriptionId: (row['provider_subscription_id'] as string) ?? null,
    gracePeriodEnd: row['grace_period_end'] ? (row['grace_period_end'] as Date).toISOString() : null,
    paymentFailedCount: (row['payment_failed_count'] as number) ?? 0,
  };
}

function mapPaymentRow(row: Record<string, unknown>): SubscriptionPayment {
  return {
    id: row['id'] as number,
    storeId: row['store_id'] as number,
    subscriptionId: row['subscription_id'] as number,
    amountAgorot: row['amount_agorot'] as number,
    type: row['type'] as PaymentType,
    description: (row['description'] as string) || null,
    fromPlanId: (row['from_plan_id'] as number) ?? null,
    toPlanId: (row['to_plan_id'] as number) ?? null,
    prorationDays: (row['proration_days'] as number) ?? null,
    periodDays: (row['period_days'] as number) ?? null,
    status: row['status'] as PaymentStatus,
    externalRef: (row['external_ref'] as string) || null,
    createdAt: (row['created_at'] as Date).toISOString(),
  };
}
