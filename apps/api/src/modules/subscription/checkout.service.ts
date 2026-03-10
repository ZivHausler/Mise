import type { CacheClient } from '../../core/cache/redis.js';
import { NotFoundError, ValidationError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';
import { getPool } from '../../core/database/postgres.js';
import { appLogger } from '../../core/logger/logger.js';
import { SubscriptionRepository } from './subscription.repository.js';
import { CheckoutRepository } from './checkout.repository.js';
import { PgStoreRepository } from '../stores/store.repository.js';
import { sendPaymentFailedEmail, sendSubscriptionDowngradedEmail } from '../notifications/channels/email.js';
import type { PaymentProvider, WebhookEvent } from './payment-providers/provider.interface.js';
import type { PayPalProvider } from './payment-providers/paypal.service.js';
import type { PlanSlug } from './subscription.types.js';
import { PaymentType, PaymentStatus } from './subscription.types.js';
import { calculateProration, getNextBillingDate } from './subscription.service.js';
import { env } from '../../config/env.js';

const CACHE_KEY_PREFIX = 'sub:features:';

export class CheckoutService {
  private subscriptionRepo: SubscriptionRepository;

  constructor(
    private checkoutRepo: CheckoutRepository,
    private providers: Map<string, PaymentProvider>,
    private cacheClient: CacheClient | null,
    private paypalProvider?: PayPalProvider,
  ) {
    this.subscriptionRepo = new SubscriptionRepository();
  }

  // ─── Initiate checkout (upgrades) ────────────────────────────────────

  async initiateCheckout(params: {
    storeId: number;
    planSlug: PlanSlug;
    actorUserId: number;
  }): Promise<{ checkoutSessionId: string; paypalSubscriptionId: string; expiresAt: string; amountAgorot: number }> {
    if (!this.paypalProvider) {
      throw new ValidationError('PayPal provider is not configured');
    }

    // 1. Get current subscription
    const currentSub = await this.subscriptionRepo.getActiveSubscription(params.storeId);
    if (!currentSub) {
      throw new NotFoundError('No active subscription found', ErrorCode.SUBSCRIPTION_NOT_FOUND);
    }

    // 2. Get target plan and validate upgrade
    const targetPlan = await this.subscriptionRepo.getPlanBySlug(params.planSlug);
    if (!targetPlan) {
      throw new NotFoundError('Plan not found', ErrorCode.NOT_FOUND);
    }

    const currentPlan = await this.subscriptionRepo.getPlanById(currentSub.planId);
    if (!currentPlan) {
      throw new NotFoundError('Current plan not found', ErrorCode.NOT_FOUND);
    }

    if (currentPlan.sortOrder >= targetPlan.sortOrder) {
      throw new ValidationError('Checkout is only available for upgrades. Use POST /subscription/change for downgrades.', ErrorCode.SUBSCRIPTION_CHANGE_NOT_ALLOWED);
    }

    // 3. Cancel any existing pending checkout sessions
    await this.checkoutRepo.cancelPendingByStoreId(params.storeId);

    // 4. Calculate amount
    let amountAgorot: number;
    let isProration = false;
    let prorationDays: number | null = null;
    let periodDays: number | null = null;

    if (currentPlan.slug === 'free') {
      amountAgorot = targetPlan.priceNis * 100;
    } else {
      const now = new Date();
      const periodStart = new Date(currentSub.currentPeriodStart);
      const periodEnd = new Date(currentSub.currentPeriodEnd);
      const proration = calculateProration(currentPlan.priceNis, targetPlan.priceNis, periodStart, periodEnd, now);
      amountAgorot = Math.max(proration.amountAgorot, 0);
      isProration = true;
      prorationDays = proration.daysRemaining;
      periodDays = proration.daysInPeriod;
    }

    // 5. Create checkout session
    const sessionId = await this.checkoutRepo.create({
      storeId: params.storeId,
      action: 'upgrade',
      targetPlanId: targetPlan.id,
      fromPlanId: currentPlan.id,
      amountAgorot,
      isProration,
      prorationDays,
      periodDays,
      provider: 'paypal',
      actorUserId: params.actorUserId,
    });

    // 6. Get store owner info for the payment page
    const members = await PgStoreRepository.getStoreMembers(params.storeId);
    const owner = members.find((m: { role: number }) => m.role === 1);
    const customerEmail = owner?.email ?? '';
    const customerName = owner?.name ?? '';

    // 7. Call PayPal SDK to create subscription (no redirect URLs)
    const amountNis = amountAgorot / 100;
    const paypalPlanId = params.planSlug === 'pro' ? env.PAYPAL_PLAN_ID_PRO : env.PAYPAL_PLAN_ID_BASIC;
    if (!paypalPlanId) {
      throw new ValidationError(`PayPal plan ID not configured for '${params.planSlug}'. Set PAYPAL_PLAN_ID_${params.planSlug.toUpperCase()} env var.`);
    }

    const metadata: Record<string, string> = {
      checkout_session_id: sessionId,
      store_id: String(params.storeId),
      plan_slug: params.planSlug,
      paypal_plan_id: paypalPlanId,
      plan_price_nis: String(targetPlan.priceNis),
    };

    if (isProration) {
      metadata['period_end'] = String(currentSub.currentPeriodEnd);
    }

    const result = await this.paypalProvider.createSubscriptionForSDK({
      amountNis,
      description: `Mise ${targetPlan.name} Plan`,
      customerEmail,
      customerName,
      metadata,
    });

    // 8. Update session with provider info (no page URL for SDK flow)
    await this.checkoutRepo.updateProviderInfo(sessionId, '', result.subscriptionId);

    // 9. Log event
    await this.subscriptionRepo.logEvent(
      params.storeId,
      currentSub.id,
      'checkout_initiated',
      currentPlan.id,
      targetPlan.id,
      { sessionId, provider: 'paypal', amountAgorot },
    );

    // 10. Retrieve session for expiry time
    const session = await this.checkoutRepo.getById(sessionId);

    return {
      checkoutSessionId: sessionId,
      paypalSubscriptionId: result.subscriptionId,
      expiresAt: session!.expiresAt,
      amountAgorot,
    };
  }

  // ─── Renewal recovery (for past_due subscriptions) ───────────────────

  async initiateRenewalRecovery(params: {
    storeId: number;
    actorUserId: number;
  }): Promise<{ checkoutSessionId: string; paypalSubscriptionId: string }> {
    if (!this.paypalProvider) {
      throw new ValidationError('PayPal provider is not configured');
    }

    const currentSub = await this.subscriptionRepo.getActiveSubscription(params.storeId);
    if (!currentSub || currentSub.status !== 'past_due') {
      throw new ValidationError('No past_due subscription to recover');
    }

    const currentPlan = await this.subscriptionRepo.getPlanById(currentSub.planId);
    if (!currentPlan) {
      throw new NotFoundError('Current plan not found', ErrorCode.NOT_FOUND);
    }

    await this.checkoutRepo.cancelPendingByStoreId(params.storeId);

    const amountAgorot = currentPlan.priceNis * 100;

    const sessionId = await this.checkoutRepo.create({
      storeId: params.storeId,
      action: 'renewal_recovery',
      targetPlanId: currentPlan.id,
      fromPlanId: currentPlan.id,
      amountAgorot,
      isProration: false,
      provider: 'paypal',
      actorUserId: params.actorUserId,
    });

    const members = await PgStoreRepository.getStoreMembers(params.storeId);
    const owner = members.find((m: { role: number }) => m.role === 1);

    const paypalPlanId = currentPlan.slug === 'pro' ? env.PAYPAL_PLAN_ID_PRO : env.PAYPAL_PLAN_ID_BASIC;
    if (!paypalPlanId) {
      throw new ValidationError(`PayPal plan ID not configured for '${currentPlan.slug}'. Set PAYPAL_PLAN_ID_${currentPlan.slug.toUpperCase()} env var.`);
    }

    const metadata: Record<string, string> = {
      checkout_session_id: sessionId,
      store_id: String(params.storeId),
      plan_slug: currentPlan.slug,
      paypal_plan_id: paypalPlanId,
    };

    const result = await this.paypalProvider.createSubscriptionForSDK({
      amountNis: amountAgorot / 100,
      description: `Mise ${currentPlan.name} Plan - Recovery`,
      customerEmail: owner?.email ?? '',
      customerName: owner?.name ?? '',
      metadata,
    });

    await this.checkoutRepo.updateProviderInfo(sessionId, '', result.subscriptionId);

    return {
      checkoutSessionId: sessionId,
      paypalSubscriptionId: result.subscriptionId,
    };
  }

  // ─── Webhook handlers ────────────────────────────────────────────────

  async handlePaymentSuccess(event: WebhookEvent): Promise<void> {
    // 1. Find checkout session
    // PayPal sends our checkout session UUID as custom_id (mapped to providerSessionId),
    // so try both provider_session_id lookup and direct id lookup.
    let session = event.providerSessionId
      ? await this.checkoutRepo.getByProviderSessionId(event.providerSessionId)
      : null;

    if (!session && event.providerSessionId) {
      session = await this.checkoutRepo.getById(event.providerSessionId);
    }

    if (!session) {
      // May be a recurring charge from the provider (not initiated by us)
      // Try to find subscription by provider_subscription_id
      if (event.providerSubscriptionId) {
        const sub = await this.subscriptionRepo.getByProviderSubscriptionId(event.providerSubscriptionId);
        if (sub) {
          // PayPal sends both BILLING.SUBSCRIPTION.ACTIVATED and PAYMENT.SALE.COMPLETED
          // for the initial payment. The first one matches our checkout session and records
          // the payment. The second one arrives here (no session match) with a different
          // transaction ID. Skip if a checkout session for this store was recently completed.
          const recentSession = await this.checkoutRepo.getRecentlyCompletedByStoreId(sub.storeId);
          if (recentSession) {
            appLogger.info({ storeId: sub.storeId, transactionId: event.transactionId }, '[Checkout] Skipping duplicate — checkout session recently completed');
            return;
          }

          // This is a genuine recurring renewal charge — record payment
          await this.subscriptionRepo.createPayment({
            storeId: sub.storeId,
            subscriptionId: sub.id,
            amountAgorot: event.amount ?? 0,
            type: PaymentType.FULL,
            description: `Recurring charge: ${sub.planName}`,
            toPlanId: sub.planId,
            status: PaymentStatus.SUCCEEDED,
            providerTransactionId: event.transactionId ?? null,
          });
          appLogger.info({ storeId: sub.storeId, transactionId: event.transactionId }, 'Recorded recurring payment');
        }
      }
      appLogger.warn({ event }, '[Checkout] No session found for payment success');
      return;
    }

    // 2. Amount verification
    if (event.amount !== undefined && event.amount > 0) {
      // event.amount is in agorot (providers convert in parseWebhookEvent)
      if (Math.abs(event.amount - session.amountAgorot) > 1) {
        appLogger.warn({
          sessionId: session.id,
          expectedAgorot: session.amountAgorot,
          receivedAgorot: event.amount,
        }, '[Checkout] Payment amount mismatch');
        // Don't reject — PayPlus might include fees. Just log for monitoring.
      }
    }

    // 3. Idempotency
    if (session.status === 'completed') {
      appLogger.info({ sessionId: session.id }, '[Checkout] Session already completed, skipping');
      return;
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (session.action === 'upgrade') {
        await this.activateAfterPayment(session, event, client);
      } else if (session.action === 'renewal_recovery') {
        await this.recoverAfterPayment(session, event, client);
      }

      // Mark session as completed
      await this.checkoutRepo.updateStatus(session.id, 'completed', new Date(), client);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      appLogger.error({ err, sessionId: session.id }, '[Checkout] Failed to process payment success');
      throw err;
    } finally {
      client.release();
    }

    await this.invalidateCache(session.storeId);
  }

  private async activateAfterPayment(
    session: import('./checkout.repository.js').CheckoutSession,
    event: WebhookEvent,
    client: import('pg').PoolClient,
  ): Promise<void> {
    const currentSub = await this.subscriptionRepo.getActiveSubscriptionForUpdate(session.storeId, client);
    if (!currentSub) {
      appLogger.error({ storeId: session.storeId }, '[Checkout] No active subscription during activate');
      return;
    }

    const targetPlan = session.targetPlanId ? await this.subscriptionRepo.getPlanById(session.targetPlanId, client) : null;
    if (!targetPlan) {
      appLogger.error({ targetPlanId: session.targetPlanId }, '[Checkout] Target plan not found during activate');
      return;
    }

    const currentPlan = await this.subscriptionRepo.getPlanById(currentSub.planId, client);
    const now = new Date();

    if (!currentPlan || currentPlan.slug === 'free') {
      // Upgrading from free
      const anchorDay = now.getDate();
      const nextBilling = getNextBillingDate(anchorDay, now);

      await this.subscriptionRepo.updateSubscription(currentSub.id, {
        planId: targetPlan.id,
        cancelAtPeriodEnd: false,
        downgradeToPlanId: null,
        billingAnchorDay: anchorDay,
        currentPeriodStart: now,
        currentPeriodEnd: nextBilling,
        paymentProvider: session.provider,
        providerSubscriptionId: event.providerSubscriptionId ?? null,
      }, client);
    } else {
      // Paid-to-paid upgrade
      await this.subscriptionRepo.updateSubscription(currentSub.id, {
        planId: targetPlan.id,
        cancelAtPeriodEnd: false,
        downgradeToPlanId: null,
        paymentProvider: session.provider,
        providerSubscriptionId: event.providerSubscriptionId ?? null,
      }, client);
    }

    // Create payment record
    await this.subscriptionRepo.createPayment({
      storeId: session.storeId,
      subscriptionId: currentSub.id,
      amountAgorot: session.amountAgorot,
      type: session.isProration ? PaymentType.PRORATION : PaymentType.FULL,
      description: `Upgrade to ${targetPlan.name}`,
      fromPlanId: session.fromPlanId,
      toPlanId: targetPlan.id,
      status: PaymentStatus.SUCCEEDED,
      checkoutSessionId: session.id,
      providerTransactionId: event.transactionId ?? null,
    }, client);

    // Log events
    await this.subscriptionRepo.logEvent(
      session.storeId, currentSub.id, 'checkout_completed',
      session.fromPlanId, targetPlan.id,
      { sessionId: session.id, provider: session.provider },
      client,
    );

    await this.subscriptionRepo.logEvent(
      session.storeId, currentSub.id, 'upgraded',
      session.fromPlanId, targetPlan.id,
      { actorUserId: session.actorUserId, viaCheckout: true },
      client,
    );
  }

  private async recoverAfterPayment(
    session: import('./checkout.repository.js').CheckoutSession,
    event: WebhookEvent,
    client: import('pg').PoolClient,
  ): Promise<void> {
    const currentSub = await this.subscriptionRepo.getActiveSubscriptionForUpdate(session.storeId, client);
    if (!currentSub) {
      appLogger.error({ storeId: session.storeId }, '[Checkout] No subscription during recovery');
      return;
    }

    const now = new Date();
    const anchorDay = currentSub.billingAnchorDay ?? now.getDate();
    const nextBilling = getNextBillingDate(anchorDay, now);

    await this.subscriptionRepo.updateSubscription(currentSub.id, {
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: nextBilling,
      gracePeriodEnd: null,
      paymentFailedCount: 0,
      paymentProvider: session.provider,
      providerSubscriptionId: event.providerSubscriptionId ?? currentSub.providerSubscriptionId,
    }, client);

    await this.subscriptionRepo.createPayment({
      storeId: session.storeId,
      subscriptionId: currentSub.id,
      amountAgorot: session.amountAgorot,
      type: PaymentType.FULL,
      description: `Recovery payment: ${currentSub.planName}`,
      toPlanId: currentSub.planId,
      status: PaymentStatus.SUCCEEDED,
      checkoutSessionId: session.id,
      providerTransactionId: event.transactionId ?? null,
    }, client);

    await this.subscriptionRepo.logEvent(
      session.storeId, currentSub.id, 'renewal_recovery_succeeded',
      currentSub.planId, currentSub.planId,
      { sessionId: session.id, provider: session.provider },
      client,
    );
  }

  async handlePaymentFailure(event: WebhookEvent): Promise<void> {
    const session = event.providerSessionId
      ? await this.checkoutRepo.getByProviderSessionId(event.providerSessionId)
      : null;

    if (!session) {
      appLogger.warn({ event }, '[Checkout] No session found for payment failure');
      return;
    }

    if (session.status !== 'pending') {
      return;
    }

    await this.checkoutRepo.updateStatus(session.id, 'failed');

    await this.subscriptionRepo.createPayment({
      storeId: session.storeId,
      subscriptionId: 0, // No specific subscription
      amountAgorot: session.amountAgorot,
      type: session.isProration ? PaymentType.PRORATION : PaymentType.FULL,
      description: 'Payment failed',
      fromPlanId: session.fromPlanId,
      toPlanId: session.targetPlanId,
      status: PaymentStatus.FAILED,
      checkoutSessionId: session.id,
    });

    await this.subscriptionRepo.logEvent(
      session.storeId, null, 'checkout_failed',
      session.fromPlanId, session.targetPlanId,
      { sessionId: session.id, provider: session.provider },
    );
  }

  async handleSubscriptionSuspended(event: WebhookEvent): Promise<void> {
    // Provider's retries exhausted (day 3)
    if (!event.providerSubscriptionId) {
      appLogger.warn({ event }, '[Checkout] Subscription suspended event without provider subscription ID');
      return;
    }

    const sub = await this.subscriptionRepo.getByProviderSubscriptionId(event.providerSubscriptionId);
    if (!sub) {
      appLogger.warn({ providerSubscriptionId: event.providerSubscriptionId }, '[Checkout] Subscription not found for suspended event');
      return;
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const locked = await this.subscriptionRepo.getActiveSubscriptionForUpdate(sub.storeId, client);
      if (!locked || locked.id !== sub.id) {
        await client.query('COMMIT');
        return;
      }

      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

      await this.subscriptionRepo.updateSubscription(locked.id, {
        status: 'past_due',
        gracePeriodEnd,
        paymentFailedCount: locked.paymentFailedCount + 1,
      }, client);

      await this.subscriptionRepo.logEvent(
        sub.storeId, locked.id, 'grace_period_started',
        locked.planId, locked.planId,
        { gracePeriodEnd: gracePeriodEnd.toISOString(), paymentFailedCount: locked.paymentFailedCount + 1 },
        client,
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      appLogger.error({ err, storeId: sub.storeId }, '[Checkout] Failed to handle subscription suspended');
      throw err;
    } finally {
      client.release();
    }

    // Send email notification (outside transaction)
    try {
      const members = await PgStoreRepository.getStoreMembers(sub.storeId);
      const owner = members.find((m: { role: number }) => m.role === 1);
      if (owner) {
        const currentPlan = await this.subscriptionRepo.getPlanById(sub.planId);
        await sendPaymentFailedEmail({
          to: owner.email,
          planName: currentPlan?.name ?? sub.planName,
          amount: sub.priceNis,
          recoveryUrl: `${env.FRONTEND_URL}/settings?tab=subscription&payment=recovery`,
        });
      }
    } catch (err) {
      appLogger.error({ err, storeId: sub.storeId }, '[Checkout] Failed to send payment failed email');
    }

    await this.invalidateCache(sub.storeId);
  }

  // ─── Grace period expiry (cron) ──────────────────────────────────────

  async processGracePeriodExpiry(): Promise<number> {
    const pool = getPool();
    const client = await pool.connect();
    let processed = 0;

    try {
      await client.query('BEGIN');

      const expiredSubs = await this.subscriptionRepo.getExpiredGracePeriods(50, client);
      if (expiredSubs.length === 0) {
        await client.query('COMMIT');
        return 0;
      }

      const freePlan = await this.subscriptionRepo.getPlanBySlug('free', client);
      if (!freePlan) {
        await client.query('COMMIT');
        return 0;
      }

      for (const sub of expiredSubs) {
        try {
          await client.query(`SAVEPOINT grace_${sub.id}`);

          // Expire current subscription
          await this.subscriptionRepo.expireSubscription(sub.id, client);

          // Create free subscription
          const { id: newSubId } = await this.subscriptionRepo.createSubscription(
            sub.storeId, freePlan.id, 'active', undefined, client,
          );

          await this.subscriptionRepo.logEvent(
            sub.storeId, newSubId, 'auto_downgraded_payment_failed',
            sub.planId, freePlan.id,
            { previousPlan: sub.planSlug, paymentFailedCount: sub.paymentFailedCount },
            client,
          );

          processed++;
        } catch (err) {
          await client.query(`ROLLBACK TO SAVEPOINT grace_${sub.id}`);
          appLogger.error({ err, subscriptionId: sub.id }, '[Checkout] Failed to process grace period expiry');
        }
      }

      await client.query('COMMIT');

      // Send emails and invalidate caches (outside transaction)
      for (const sub of expiredSubs) {
        try {
          const members = await PgStoreRepository.getStoreMembers(sub.storeId);
          const owner = members.find((m: { role: number }) => m.role === 1);
          if (owner) {
            await sendSubscriptionDowngradedEmail({
              to: owner.email,
              planName: sub.planName,
            });
          }
        } catch (err) {
          appLogger.error({ err, storeId: sub.storeId }, '[Checkout] Failed to send downgraded email');
        }
        await this.invalidateCache(sub.storeId);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      appLogger.error({ err }, '[Checkout] Failed to process grace period expiry batch');
    } finally {
      client.release();
    }

    if (processed > 0) {
      appLogger.info({ processed }, '[Checkout] Processed grace period expiries');
    }
    return processed;
  }

  // ─── Stale checkout cleanup (cron) ───────────────────────────────────

  async expireStaleCheckouts(): Promise<number> {
    const expired = await this.checkoutRepo.expireStale();
    if (expired > 0) {
      appLogger.info({ expired }, '[Checkout] Expired stale checkout sessions');
    }
    return expired;
  }

  // ─── Status check (frontend polling) ─────────────────────────────────

  async getCheckoutStatus(sessionId: string, storeId: number): Promise<{ status: string }> {
    const session = await this.checkoutRepo.getById(sessionId);
    if (!session || session.storeId !== storeId) {
      throw new NotFoundError('Checkout session not found', ErrorCode.CHECKOUT_SESSION_NOT_FOUND);
    }
    return { status: session.status };
  }

  // ─── Cache ───────────────────────────────────────────────────────────

  private async invalidateCache(storeId: number): Promise<void> {
    if (this.cacheClient) {
      try {
        await this.cacheClient.del(`${CACHE_KEY_PREFIX}${storeId}`);
      } catch (err) {
        appLogger.error({ storeId, err }, 'Failed to invalidate subscription cache');
      }
    }
  }
}
