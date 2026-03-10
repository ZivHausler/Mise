import { appLogger } from '../../core/logger/logger.js';
import type { SubscriptionService } from './subscription.service.js';
import type { CheckoutService } from './checkout.service.js';

const CRON_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CHECKOUT_EXPIRE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Milliseconds until next 01:00 UTC (04:00 Israel time)
function msUntilNextRun(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(1, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

let cronTimer: ReturnType<typeof setTimeout> | null = null;
let checkoutExpireTimer: ReturnType<typeof setInterval> | null = null;

export function startSubscriptionCron(service: SubscriptionService, checkoutService?: CheckoutService): void {
  const scheduleNext = () => {
    const delay = msUntilNextRun();
    appLogger.info({ nextRunInMs: delay }, 'Subscription cron: scheduling next period-end processing');

    cronTimer = setTimeout(async () => {
      try {
        appLogger.info('Subscription cron: starting period-end processing');
        const processed = await service.processPeriodEnd();
        appLogger.info({ processed }, 'Subscription cron: period-end processing complete');

        // Process trial reminder emails
        try {
          const remindersSent = await service.processTrialReminders();
          if (remindersSent > 0) {
            appLogger.info({ remindersSent }, 'Subscription cron: trial reminders sent');
          }
        } catch (reminderErr) {
          appLogger.error({ err: reminderErr }, 'Subscription cron: trial reminder processing failed');
        }

        // Process grace period expiry (downgrade past_due subscriptions)
        if (checkoutService) {
          try {
            const graceExpired = await checkoutService.processGracePeriodExpiry();
            if (graceExpired > 0) {
              appLogger.info({ graceExpired }, 'Subscription cron: grace period expiries processed');
            }
          } catch (graceErr) {
            appLogger.error({ err: graceErr }, 'Subscription cron: grace period expiry processing failed');
          }
        }
      } catch (err) {
        appLogger.error({ err }, 'Subscription cron: period-end processing failed');
      }
      // Schedule next run
      scheduleNext();
    }, delay);

    // Don't prevent process from exiting
    if (cronTimer && typeof cronTimer === 'object' && 'unref' in cronTimer) {
      cronTimer.unref();
    }
  };

  scheduleNext();

  // Expire stale checkout sessions every 5 minutes
  if (checkoutService) {
    checkoutExpireTimer = setInterval(async () => {
      try {
        await checkoutService.expireStaleCheckouts();
      } catch (err) {
        appLogger.error({ err }, 'Subscription cron: checkout expire processing failed');
      }
    }, CHECKOUT_EXPIRE_INTERVAL_MS);

    if (checkoutExpireTimer && typeof checkoutExpireTimer === 'object' && 'unref' in checkoutExpireTimer) {
      checkoutExpireTimer.unref();
    }
  }
}

export function stopSubscriptionCron(): void {
  if (cronTimer) {
    clearTimeout(cronTimer);
    cronTimer = null;
  }
  if (checkoutExpireTimer) {
    clearInterval(checkoutExpireTimer);
    checkoutExpireTimer = null;
  }
}
