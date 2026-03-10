import type { CacheClient } from '../../core/cache/redis.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';
import { getPool } from '../../core/database/postgres.js';
import { appLogger } from '../../core/logger/logger.js';
import { SubscriptionRepository } from './subscription.repository.js';
import { PgStoreRepository } from '../stores/store.repository.js';
import { sendTrialReminderEmail } from '../notifications/channels/email.js';
import type { SubscriptionEventType } from './subscription.types.js';
import type { Plan, PlanSlug, StoreSubscription, PlanChangePreview, SubscriptionPayment } from './subscription.types.js';
import { PaymentType, PaymentStatus } from './subscription.types.js';

const CACHE_KEY_PREFIX = 'sub:features:';
const CACHE_TTL_SECONDS = 300; // 5 minutes

// ─── Proration helpers ───────────────────────────────────────────────

/** Clamp anchor day to valid day in target month */
export function clampAnchorDay(anchorDay: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Math.min(anchorDay, daysInMonth);
}

/** Get next billing date from anchor day, starting from a given date */
export function getNextBillingDate(anchorDay: number, fromDate: Date): Date {
  let year = fromDate.getFullYear();
  let month = fromDate.getMonth();

  // If we haven't passed the anchor day this month, bill this month
  const clampedDay = clampAnchorDay(anchorDay, year, month);
  if (fromDate.getDate() < clampedDay) {
    return new Date(year, month, clampedDay);
  }

  // Otherwise, next month
  month += 1;
  if (month > 11) { month = 0; year += 1; }
  const nextDay = clampAnchorDay(anchorDay, year, month);
  return new Date(year, month, nextDay);
}

const MS_PER_DAY = 86400000;

/** Calculate proration amount when switching from oldPrice to newPrice mid-period */
export function calculateProration(
  oldPriceNis: number,
  newPriceNis: number,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
): { amountAgorot: number; daysRemaining: number; daysInPeriod: number } {
  const daysInPeriod = Math.round((periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY);
  if (daysInPeriod <= 0) {
    return { amountAgorot: 0, daysRemaining: 0, daysInPeriod: 0 };
  }
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / MS_PER_DAY));

  const oldAgorot = oldPriceNis * 100;
  const newAgorot = newPriceNis * 100;
  const amountAgorot = Math.round((newAgorot - oldAgorot) * (daysRemaining / daysInPeriod));

  return { amountAgorot, daysRemaining, daysInPeriod };
}

// ─── Service ─────────────────────────────────────────────────────────

export class SubscriptionService {
  private repository: SubscriptionRepository;

  constructor(private cacheClient: CacheClient | null) {
    this.repository = new SubscriptionRepository();
  }

  async getPlans(): Promise<Plan[]> {
    return this.repository.getPlans();
  }

  async getStoreSubscription(storeId: number): Promise<StoreSubscription> {
    const sub = await this.repository.getActiveSubscription(storeId);
    if (!sub) {
      throw new NotFoundError('No active subscription found', ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    // Handle inline trial expiry
    if (sub.status === 'trialing' && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
      await this.processExpiredTrial(storeId, sub);
      const newSub = await this.repository.getActiveSubscription(storeId);
      if (!newSub) {
        throw new NotFoundError('No active subscription found', ErrorCode.SUBSCRIPTION_NOT_FOUND);
      }
      return newSub;
    }

    // past_due subs are visible (they show a banner in the UI)
    if (sub.status === 'past_due') {
      return sub;
    }

    // Inline fallback: handle expired paid subscription period (safety net for cron)
    if (
      sub.status === 'active' &&
      sub.planSlug !== 'free' &&
      new Date(sub.currentPeriodEnd) < new Date()
    ) {
      await this.processOnePeriodEnd(sub);
      const newSub = await this.repository.getActiveSubscription(storeId);
      if (!newSub) {
        throw new NotFoundError('No active subscription found', ErrorCode.SUBSCRIPTION_NOT_FOUND);
      }
      return newSub;
    }

    return sub;
  }

  async getStoreFeatures(storeId: number): Promise<string[]> {
    // Check Redis cache first
    if (this.cacheClient) {
      try {
        const cached = await this.cacheClient.get(`${CACHE_KEY_PREFIX}${storeId}`);
        if (cached) {
          return JSON.parse(cached) as string[];
        }
      } catch {
        // Cache miss or error, fall through to DB
      }
    }

    let sub: StoreSubscription;
    try {
      sub = await this.getStoreSubscription(storeId);
    } catch {
      // No subscription found — return empty features (free tier baseline)
      return [];
    }

    const features = sub.features;

    // Cache the result
    if (this.cacheClient) {
      try {
        await this.cacheClient.set(`${CACHE_KEY_PREFIX}${storeId}`, JSON.stringify(features), CACHE_TTL_SECONDS);
      } catch {
        // Ignore cache write failures
      }
    }

    return features;
  }

  // ─── Subscribe (upgrade / downgrade) ──────────────────────────────

  async subscribe(storeId: number, planSlug: PlanSlug, actorUserId: number): Promise<StoreSubscription> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const targetPlan = await this.repository.getPlanBySlug(planSlug, client);
      if (!targetPlan) {
        throw new NotFoundError('Plan not found', ErrorCode.NOT_FOUND);
      }

      const currentSub = await this.repository.getActiveSubscriptionForUpdate(storeId, client);

      if (currentSub && currentSub.planSlug === planSlug) {
        // If same plan and there's a pending downgrade, treat as "cancel downgrade"
        if (currentSub.cancelAtPeriodEnd && currentSub.downgradeToSlug) {
          await this.repository.updateSubscription(currentSub.id, {
            cancelAtPeriodEnd: false,
            downgradeToPlanId: null,
          }, client);
          await this.repository.logEvent(
            storeId, currentSub.id, 'downgrade_canceled',
            currentSub.planId, currentSub.planId,
            { actorUserId }, client,
          );
          await client.query('COMMIT');
          await this.invalidateCache(storeId);
          return this.getStoreSubscription(storeId);
        }
        throw new ValidationError('Store is already on this plan', ErrorCode.SUBSCRIPTION_ALREADY_ON_PLAN);
      }

      const currentPlan = currentSub ? await this.repository.getPlanById(currentSub.planId, client) : null;
      const isUpgrade = !currentPlan || currentPlan.sortOrder < targetPlan.sortOrder;

      if (isUpgrade) {
        // Upgrades to paid plans require payment — redirect to checkout
        if (targetPlan.priceNis > 0) {
          await client.query('ROLLBACK');
          throw new ValidationError(
            'Use POST /subscription/checkout for paid plan upgrades',
            ErrorCode.PAYMENT_REQUIRED,
          );
        }
        await this.handleUpgrade(storeId, currentSub, currentPlan, targetPlan, actorUserId, client);
      } else {
        await this.handleDowngrade(storeId, currentSub!, currentPlan!, targetPlan, actorUserId, client);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await this.invalidateCache(storeId);
    return this.getStoreSubscription(storeId);
  }

  private async handleUpgrade(
    storeId: number,
    currentSub: StoreSubscription | null,
    currentPlan: Plan | null,
    targetPlan: Plan,
    actorUserId: number,
    client: import('pg').PoolClient,
  ): Promise<void> {
    const now = new Date();

    if (!currentSub || !currentPlan || currentPlan.slug === 'free') {
      // Upgrading from free (or no sub): charge full price, set billing anchor
      const anchorDay = now.getDate();
      const nextBilling = getNextBillingDate(anchorDay, now);

      if (currentSub) {
        // Clear any pending downgrade
        await this.repository.updateSubscription(currentSub.id, {
          planId: targetPlan.id,
          cancelAtPeriodEnd: false,
          downgradeToPlanId: null,
          billingAnchorDay: anchorDay,
          currentPeriodStart: now,
          currentPeriodEnd: nextBilling,
        }, client);
      } else {
        // No existing sub — create fresh
        const { id: newSubId } = await this.repository.createSubscription(storeId, targetPlan.id, 'active', undefined, client);
        await this.repository.updateSubscription(newSubId, {
          billingAnchorDay: anchorDay,
          currentPeriodStart: now,
          currentPeriodEnd: nextBilling,
        }, client);
      }

      const subAfter = await this.repository.getActiveSubscriptionForUpdate(storeId, client);
      if (!subAfter) throw new NotFoundError('Subscription disappeared during upgrade', ErrorCode.SUBSCRIPTION_NOT_FOUND);

      await this.repository.createPayment({
        storeId,
        subscriptionId: subAfter.id,
        amountAgorot: targetPlan.priceNis * 100,
        type: PaymentType.FULL,
        description: `Upgrade to ${targetPlan.name}`,
        fromPlanId: currentPlan?.id ?? null,
        toPlanId: targetPlan.id,
        status: PaymentStatus.SUCCEEDED,
      }, client);

      await this.repository.logEvent(
        storeId, subAfter.id, 'upgraded',
        currentPlan?.id ?? null, targetPlan.id,
        { actorUserId }, client,
      );
    } else {
      // Paid-to-paid upgrade: prorate, update plan in-place, keep period
      const periodStart = new Date(currentSub.currentPeriodStart);
      const periodEnd = new Date(currentSub.currentPeriodEnd);
      const { amountAgorot, daysRemaining, daysInPeriod } = calculateProration(
        currentPlan.priceNis, targetPlan.priceNis, periodStart, periodEnd, now,
      );

      // Clear any pending downgrade, switch plan
      await this.repository.updateSubscription(currentSub.id, {
        planId: targetPlan.id,
        cancelAtPeriodEnd: false,
        downgradeToPlanId: null,
      }, client);

      if (amountAgorot > 0) {
        await this.repository.createPayment({
          storeId,
          subscriptionId: currentSub.id,
          amountAgorot,
          type: PaymentType.PRORATION,
          description: `Proration: ${currentPlan.name} -> ${targetPlan.name}`,
          fromPlanId: currentPlan.id,
          toPlanId: targetPlan.id,
          prorationDays: daysRemaining,
          periodDays: daysInPeriod,
          status: PaymentStatus.SUCCEEDED,
        }, client);
      }

      await this.repository.logEvent(
        storeId, currentSub.id, 'upgraded',
        currentPlan.id, targetPlan.id,
        { actorUserId, prorationAgorot: amountAgorot, daysRemaining, daysInPeriod }, client,
      );
    }
  }

  private async handleDowngrade(
    storeId: number,
    currentSub: StoreSubscription,
    currentPlan: Plan,
    targetPlan: Plan,
    actorUserId: number,
    client: import('pg').PoolClient,
  ): Promise<void> {
    if (currentSub.cancelAtPeriodEnd && currentSub.downgradeToSlug) {
      // Already has a pending downgrade — overwrite target
      await this.repository.updateSubscription(currentSub.id, {
        downgradeToPlanId: targetPlan.id,
      }, client);

      await this.repository.logEvent(
        storeId, currentSub.id, 'pending_plan_changed',
        currentPlan.id, targetPlan.id,
        { actorUserId }, client,
      );
    } else {
      // Schedule a new downgrade
      await this.repository.updateSubscription(currentSub.id, {
        cancelAtPeriodEnd: true,
        downgradeToPlanId: targetPlan.id,
      }, client);

      await this.repository.logEvent(
        storeId, currentSub.id, 'downgrade_scheduled',
        currentPlan.id, targetPlan.id,
        { actorUserId, effectiveDate: currentSub.currentPeriodEnd }, client,
      );
    }
  }

  // ─── Preview change ───────────────────────────────────────────────

  async previewChange(storeId: number, planSlug: PlanSlug): Promise<PlanChangePreview> {
    const currentSub = await this.repository.getActiveSubscription(storeId);
    if (!currentSub) {
      throw new NotFoundError('No active subscription found', ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    const targetPlan = await this.repository.getPlanBySlug(planSlug);
    if (!targetPlan) {
      throw new NotFoundError('Plan not found', ErrorCode.NOT_FOUND);
    }

    if (currentSub.planSlug === planSlug && !currentSub.cancelAtPeriodEnd) {
      throw new ValidationError('Store is already on this plan', ErrorCode.SUBSCRIPTION_ALREADY_ON_PLAN);
    }

    const currentPlan = await this.repository.getPlanById(currentSub.planId);
    if (!currentPlan) {
      throw new NotFoundError('Current plan not found', ErrorCode.NOT_FOUND);
    }

    const now = new Date();

    // Trial active — selecting a plan for post-trial
    if (currentSub.status === 'trialing') {
      const trialEnd = currentSub.trialEndsAt ? new Date(currentSub.trialEndsAt) : now;
      const anchorDay = trialEnd.getDate();
      const nextBilling = getNextBillingDate(anchorDay, trialEnd);

      return {
        type: 'trial_selection',
        currentPlan: currentPlan.slug,
        targetPlan: targetPlan.slug,
        immediateChargeAgorot: null,
        nextRenewalAmountAgorot: targetPlan.priceNis * 100,
        nextRenewalDate: nextBilling.toISOString(),
        daysRemaining: Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / MS_PER_DAY)),
        daysInPeriod: 0,
        effectiveDate: trialEnd.toISOString(),
      };
    }

    const isUpgrade = currentPlan.sortOrder < targetPlan.sortOrder;
    const periodStart = new Date(currentSub.currentPeriodStart);
    const periodEnd = new Date(currentSub.currentPeriodEnd);

    if (isUpgrade) {
      if (currentPlan.slug === 'free') {
        const anchorDay = now.getDate();
        const nextBilling = getNextBillingDate(anchorDay, now);
        return {
          type: 'upgrade',
          currentPlan: currentPlan.slug,
          targetPlan: targetPlan.slug,
          immediateChargeAgorot: targetPlan.priceNis * 100,
          nextRenewalAmountAgorot: targetPlan.priceNis * 100,
          nextRenewalDate: nextBilling.toISOString(),
          daysRemaining: 0,
          daysInPeriod: 0,
          effectiveDate: now.toISOString(),
        };
      }

      const { amountAgorot, daysRemaining, daysInPeriod } = calculateProration(
        currentPlan.priceNis, targetPlan.priceNis, periodStart, periodEnd, now,
      );
      const anchorDay = currentSub.billingAnchorDay ?? now.getDate();
      const nextBilling = getNextBillingDate(anchorDay, periodEnd);
      return {
        type: 'upgrade',
        currentPlan: currentPlan.slug,
        targetPlan: targetPlan.slug,
        immediateChargeAgorot: amountAgorot,
        nextRenewalAmountAgorot: targetPlan.priceNis * 100,
        nextRenewalDate: nextBilling.toISOString(),
        daysRemaining,
        daysInPeriod,
        effectiveDate: now.toISOString(),
      };
    }

    // Downgrade: takes effect at period end
    const anchorDay = currentSub.billingAnchorDay ?? periodEnd.getDate();
    const nextBillingAfterEnd = getNextBillingDate(anchorDay, periodEnd);
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / MS_PER_DAY));
    const daysInPeriod = Math.round((periodEnd.getTime() - periodStart.getTime()) / MS_PER_DAY);

    return {
      type: 'downgrade',
      currentPlan: currentPlan.slug,
      targetPlan: targetPlan.slug,
      immediateChargeAgorot: null,
      nextRenewalAmountAgorot: targetPlan.priceNis * 100,
      nextRenewalDate: targetPlan.slug === 'free' ? periodEnd.toISOString() : nextBillingAfterEnd.toISOString(),
      daysRemaining,
      daysInPeriod,
      effectiveDate: periodEnd.toISOString(),
    };
  }

  // ─── Cancel downgrade ─────────────────────────────────────────────

  async cancelDowngrade(storeId: number, actorUserId: number): Promise<StoreSubscription> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentSub = await this.repository.getActiveSubscriptionForUpdate(storeId, client);
      if (!currentSub) {
        throw new NotFoundError('No active subscription found', ErrorCode.SUBSCRIPTION_NOT_FOUND);
      }

      if (!currentSub.cancelAtPeriodEnd || !currentSub.downgradeToSlug) {
        throw new ValidationError('No pending downgrade to cancel', ErrorCode.SUBSCRIPTION_NO_PENDING_DOWNGRADE);
      }

      await this.repository.updateSubscription(currentSub.id, {
        cancelAtPeriodEnd: false,
        downgradeToPlanId: null,
      }, client);

      await this.repository.logEvent(
        storeId, currentSub.id, 'downgrade_canceled',
        currentSub.planId, currentSub.planId,
        { actorUserId }, client,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await this.invalidateCache(storeId);
    return this.getStoreSubscription(storeId);
  }

  // ─── Payments ─────────────────────────────────────────────────────

  async getPayments(storeId: number, limit = 20, offset = 0): Promise<{ payments: SubscriptionPayment[]; total: number }> {
    const [payments, total] = await Promise.all([
      this.repository.getPayments(storeId, limit, offset),
      this.repository.getPaymentCount(storeId),
    ]);
    return { payments, total };
  }

  // ─── Cancel subscription (schedule downgrade to free) ─────────────

  async cancel(storeId: number, actorUserId: number): Promise<StoreSubscription> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const currentSub = await this.repository.getActiveSubscriptionForUpdate(storeId, client);
      if (!currentSub) {
        throw new NotFoundError('No active subscription found', ErrorCode.SUBSCRIPTION_NOT_FOUND);
      }

      const freePlan = await this.repository.getPlanBySlug('free', client);
      if (!freePlan) {
        throw new NotFoundError('Free plan not found', ErrorCode.NOT_FOUND);
      }

      if (currentSub.planSlug === 'free') {
        throw new ValidationError('Already on free plan', ErrorCode.SUBSCRIPTION_ALREADY_ON_PLAN);
      }

      await this.repository.updateSubscription(currentSub.id, {
        cancelAtPeriodEnd: true,
        downgradeToPlanId: freePlan.id,
      }, client);

      await this.repository.logEvent(
        storeId,
        currentSub.id,
        'canceled',
        currentSub.planId,
        freePlan.id,
        { actorUserId },
        client,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await this.invalidateCache(storeId);
    return this.getStoreSubscription(storeId);
  }

  // ─── Admin force change ───────────────────────────────────────────

  async adminForceChangePlan(storeId: number, planSlug: PlanSlug, actorUserId: number): Promise<StoreSubscription> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const targetPlan = await this.repository.getPlanBySlug(planSlug, client);
      if (!targetPlan) {
        throw new NotFoundError('Plan not found', ErrorCode.NOT_FOUND);
      }

      const currentSub = await this.repository.getActiveSubscriptionForUpdate(storeId, client);

      if (currentSub && currentSub.planSlug === planSlug) {
        throw new ValidationError('Store is already on this plan', ErrorCode.SUBSCRIPTION_ALREADY_ON_PLAN);
      }

      // Expire current subscription immediately
      if (currentSub) {
        await this.repository.expireSubscription(currentSub.id, client);
      }

      // Create new subscription
      const { id: newSubId } = await this.repository.createSubscription(storeId, targetPlan.id, 'active', undefined, client);

      const currentPlan = currentSub ? await this.repository.getPlanById(currentSub.planId, client) : null;
      const eventType = currentPlan && currentPlan.sortOrder > targetPlan.sortOrder ? 'downgraded' : 'upgraded';

      await this.repository.logEvent(
        storeId,
        newSubId,
        eventType,
        currentSub?.planId ?? null,
        targetPlan.id,
        { actorUserId, adminForced: true },
        client,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await this.invalidateCache(storeId);
    return this.getStoreSubscription(storeId);
  }

  // ─── Trial subscription creation ─────────────────────────────────

  async createTrialSubscription(storeId: number): Promise<void> {
    const proPlan = await this.repository.getPlanBySlug('pro');
    if (!proPlan) {
      // Fallback: if no pro plan, just create a free subscription
      const freePlan = await this.repository.getPlanBySlug('free');
      if (freePlan) {
        await this.repository.createSubscription(storeId, freePlan.id, 'active');
      }
      return;
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { id: subId } = await this.repository.createSubscription(storeId, proPlan.id, 'trialing', trialEndsAt);

    await this.repository.logEvent(storeId, subId, 'trial_started', null, proPlan.id, {
      trialDays: 14,
    });
  }

  // ─── Trial expiry ────────────────────────────────────────────────

  private async processExpiredTrial(storeId: number, subscription: StoreSubscription): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Re-read with FOR UPDATE to prevent concurrent processing
      const lockedSub = await this.repository.getActiveSubscriptionForUpdate(storeId, client);

      // If the subscription is no longer trialing (another request already processed it), bail out
      if (!lockedSub || lockedSub.id !== subscription.id || lockedSub.status !== 'trialing') {
        await client.query('COMMIT');
        return;
      }

      // Check if user selected a plan during trial (downgrade_to_plan_id set)
      const downgradeToPlanId = await this.repository.getDowngradeToPlanId(subscription.id, client);

      if (downgradeToPlanId) {
        const targetPlan = await this.repository.getPlanById(downgradeToPlanId, client);
        if (targetPlan && targetPlan.slug !== 'free') {
          // User selected a paid plan during trial — activate it
          const now = new Date();
          const anchorDay = now.getDate();
          const nextBilling = getNextBillingDate(anchorDay, now);

          await this.repository.updateSubscription(subscription.id, {
            status: 'active',
            planId: targetPlan.id,
            cancelAtPeriodEnd: false,
            downgradeToPlanId: null,
            billingAnchorDay: anchorDay,
            currentPeriodStart: now,
            currentPeriodEnd: nextBilling,
          }, client);

          // Charge full price
          await this.repository.createPayment({
            storeId,
            subscriptionId: subscription.id,
            amountAgorot: targetPlan.priceNis * 100,
            type: PaymentType.FULL,
            description: `Trial ended, activated ${targetPlan.name}`,
            fromPlanId: subscription.planId,
            toPlanId: targetPlan.id,
            status: PaymentStatus.SUCCEEDED,
          }, client);

          await this.repository.logEvent(
            storeId, subscription.id, 'trial_expired',
            subscription.planId, targetPlan.id,
            { selectedPlan: targetPlan.slug }, client,
          );

          await client.query('COMMIT');
          await this.invalidateCache(storeId);
          return;
        }
      }

      // Default: expire trial and fall to free
      await this.repository.expireSubscription(subscription.id, client);

      const freePlan = await this.repository.getPlanBySlug('free', client);
      if (!freePlan) {
        await client.query('COMMIT');
        return;
      }

      const { id: newSubId } = await this.repository.createSubscription(storeId, freePlan.id, 'active', undefined, client);

      await this.repository.logEvent(
        storeId,
        newSubId,
        'trial_expired',
        subscription.planId,
        freePlan.id,
        undefined,
        client,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      // If we hit a unique constraint or serialization error, the trial was already processed
      // by a concurrent request — just re-read the subscription state
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505' || pgErr.code === '40001') {
        appLogger.warn({ storeId, err }, 'Concurrent trial expiry processing detected, re-reading state');
        return;
      }
      throw err;
    } finally {
      client.release();
    }

    await this.invalidateCache(storeId);
  }

  // ─── Period end processing (cron + inline fallback) ───────────────

  async processPeriodEnd(): Promise<number> {
    const pool = getPool();
    const batchSize = 50;
    let totalProcessed = 0;

    // Process in batches
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const client = await pool.connect();
      let batchCount = 0;
      try {
        await client.query('BEGIN');

        const expiredSubs = await this.repository.getExpiredSubscriptions(batchSize, client);
        if (expiredSubs.length === 0) {
          await client.query('COMMIT');
          break;
        }

        for (const sub of expiredSubs) {
          await client.query(`SAVEPOINT sub_${sub.id}`);
          try {
            await this.processOnePeriodEndInTx(sub, client);
            batchCount++;
          } catch (err) {
            await client.query(`ROLLBACK TO SAVEPOINT sub_${sub.id}`);
            appLogger.error({ err, subscriptionId: sub.id }, 'Failed to process period end');
          }
        }

        await client.query('COMMIT');
        totalProcessed += batchCount;

        // Invalidate caches for processed subs
        for (const sub of expiredSubs) {
          await this.invalidateCache(sub.storeId);
        }

        if (expiredSubs.length < batchSize) break;
      } catch (err) {
        await client.query('ROLLBACK');
        appLogger.error({ err }, 'Failed to process period end batch');
        break;
      } finally {
        client.release();
      }
    }

    if (totalProcessed > 0) {
      appLogger.info({ totalProcessed }, 'Processed subscription period ends');
    }
    return totalProcessed;
  }

  /** Process a single expired subscription, opening its own transaction */
  private async processOnePeriodEnd(sub: StoreSubscription): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Re-lock to prevent concurrent processing
      const locked = await this.repository.getActiveSubscriptionForUpdate(sub.storeId, client);
      if (!locked || locked.id !== sub.id || locked.status !== 'active') {
        await client.query('COMMIT');
        return;
      }
      if (new Date(locked.currentPeriodEnd) > new Date()) {
        // Period hasn't actually ended yet (race condition)
        await client.query('COMMIT');
        return;
      }
      await this.processOnePeriodEndInTx(locked, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    await this.invalidateCache(sub.storeId);
  }

  /** Process period end within an existing transaction (sub must be locked with FOR UPDATE) */
  private async processOnePeriodEndInTx(sub: StoreSubscription, client: import('pg').PoolClient): Promise<void> {
    const downgradeToPlanId = await this.repository.getDowngradeToPlanId(sub.id, client);
    const anchorDay = sub.billingAnchorDay ?? new Date(sub.currentPeriodEnd).getDate();

    if (sub.cancelAtPeriodEnd && downgradeToPlanId) {
      // Pending downgrade — switch plan
      const targetPlan = await this.repository.getPlanById(downgradeToPlanId, client);
      if (!targetPlan) {
        appLogger.error({ subscriptionId: sub.id, downgradeToPlanId }, 'Downgrade target plan not found');
        return;
      }

      if (targetPlan.slug === 'free') {
        // Downgrade to free: expire current, create free sub
        await this.repository.expireSubscription(sub.id, client);
        const { id: newSubId } = await this.repository.createSubscription(sub.storeId, targetPlan.id, 'active', undefined, client);
        await this.repository.logEvent(
          sub.storeId, newSubId, 'downgraded',
          sub.planId, targetPlan.id, {}, client,
        );
      } else {
        // Downgrade to another paid plan: update in-place, charge new price
        const now = new Date();
        const nextBilling = getNextBillingDate(anchorDay, now);

        await this.repository.updateSubscription(sub.id, {
          planId: targetPlan.id,
          cancelAtPeriodEnd: false,
          downgradeToPlanId: null,
          currentPeriodStart: now,
          currentPeriodEnd: nextBilling,
        }, client);

        await this.repository.createPayment({
          storeId: sub.storeId,
          subscriptionId: sub.id,
          amountAgorot: targetPlan.priceNis * 100,
          type: PaymentType.FULL,
          description: `Downgrade renewal: ${sub.planSlug} -> ${targetPlan.slug}`,
          fromPlanId: sub.planId,
          toPlanId: targetPlan.id,
          status: PaymentStatus.SUCCEEDED,
        }, client);

        await this.repository.logEvent(
          sub.storeId, sub.id, 'downgraded',
          sub.planId, targetPlan.id, {}, client,
        );
      }
    } else {
      // Renewal
      const now = new Date();
      const nextBilling = getNextBillingDate(anchorDay, now);
      const currentPlan = await this.repository.getPlanById(sub.planId, client);
      if (!currentPlan) {
        appLogger.error({ subscriptionId: sub.id, planId: sub.planId }, 'Current plan not found during renewal');
        return;
      }

      // If a payment provider is set, the provider handles the charge automatically.
      // We just advance the period — the webhook will record the payment.
      if (sub.paymentProvider) {
        await this.repository.updateSubscription(sub.id, {
          currentPeriodStart: now,
          currentPeriodEnd: nextBilling,
        }, client);

        await this.repository.logEvent(
          sub.storeId, sub.id, 'renewed',
          sub.planId, sub.planId,
          { provider: sub.paymentProvider, awaitingProviderCharge: true },
          client,
        );
      } else {
        // No payment provider on a paid subscription (edge case) — auto-downgrade to free
        const freePlan = await this.repository.getPlanBySlug('free', client);
        if (freePlan) {
          await this.repository.expireSubscription(sub.id, client);
          const { id: newSubId } = await this.repository.createSubscription(sub.storeId, freePlan.id, 'active', undefined, client);
          await this.repository.logEvent(
            sub.storeId, newSubId, 'auto_downgraded_payment_failed',
            sub.planId, freePlan.id,
            { reason: 'no_payment_provider' },
            client,
          );
          appLogger.warn({ subscriptionId: sub.id, storeId: sub.storeId }, 'Paid subscription without payment provider — auto-downgraded to free');
        } else {
          // Fallback: just advance the period (shouldn't happen)
          await this.repository.updateSubscription(sub.id, {
            currentPeriodStart: now,
            currentPeriodEnd: nextBilling,
          }, client);

          await this.repository.createPayment({
            storeId: sub.storeId,
            subscriptionId: sub.id,
            amountAgorot: currentPlan.priceNis * 100,
            type: PaymentType.FULL,
            description: `Renewal: ${currentPlan.name}`,
            toPlanId: currentPlan.id,
            status: PaymentStatus.SUCCEEDED,
          }, client);

          await this.repository.logEvent(
            sub.storeId, sub.id, 'renewed',
            sub.planId, sub.planId, {}, client,
          );
        }
      }
    }
  }

  // ─── Trial reminder notifications ────────────────────────────────

  async processTrialReminders(): Promise<number> {
    const now = new Date();
    let totalSent = 0;

    const windows: { daysAhead: number; reminderType: '3d' | '1d' | '0d'; eventType: SubscriptionEventType }[] = [
      { daysAhead: 3, reminderType: '3d', eventType: 'trial_reminder_3d' },
      { daysAhead: 1, reminderType: '1d', eventType: 'trial_reminder_1d' },
      { daysAhead: 0, reminderType: '0d', eventType: 'trial_reminder_0d' },
    ];

    for (const { daysAhead, reminderType, eventType } of windows) {
      const targetDate = new Date(now);
      targetDate.setUTCDate(targetDate.getUTCDate() + daysAhead);

      const subs = await this.repository.getTrialingSubscriptionsByTrialEndDate(targetDate);

      for (const sub of subs) {
        try {
          // Idempotency: skip if this reminder was already sent
          const alreadySent = await this.repository.hasEvent(sub.subscriptionId, eventType);
          if (alreadySent) continue;

          // Get store owner (role = 1)
          const members = await PgStoreRepository.getStoreMembers(sub.storeId);
          const owner = members.find((m: { role: number }) => m.role === 1);
          if (!owner) {
            appLogger.warn({ storeId: sub.storeId }, 'No owner found for store, skipping trial reminder');
            continue;
          }

          await sendTrialReminderEmail({
            to: owner.email,
            reminderType,
            planName: sub.planName,
            trialEndsAt: sub.trialEndsAt,
          });

          // Log event to prevent duplicate sends
          await this.repository.logEvent(
            sub.storeId,
            sub.subscriptionId,
            eventType,
            null,
            null,
            { reminderType, ownerEmail: owner.email },
          );

          totalSent++;
        } catch (err) {
          appLogger.error(
            { err, storeId: sub.storeId, subscriptionId: sub.subscriptionId, reminderType },
            'Failed to send trial reminder',
          );
        }
      }
    }

    if (totalSent > 0) {
      appLogger.info({ totalSent }, 'Sent trial reminder emails');
    }

    return totalSent;
  }

  // ─── Cache ────────────────────────────────────────────────────────

  async invalidateCache(storeId: number): Promise<void> {
    if (this.cacheClient) {
      try {
        await this.cacheClient.del(`${CACHE_KEY_PREFIX}${storeId}`);
      } catch (err) {
        appLogger.error({ storeId, err }, 'Failed to invalidate subscription cache');
      }
    }
  }
}
