import type { FastifyRequest, FastifyReply } from 'fastify';
import { appLogger } from '../../core/logger/logger.js';
import type { CheckoutService } from './checkout.service.js';
import type { PaymentProvider } from './payment-providers/provider.interface.js';

export class WebhookController {
  constructor(
    private checkoutService: CheckoutService,
    private providers: Map<string, PaymentProvider>,
  ) {}

  async handlePayPlus(request: FastifyRequest, reply: FastifyReply) {
    const provider = this.providers.get('payplus');
    if (!provider) {
      appLogger.error('[Webhook] PayPlus provider not configured');
      return reply.status(200).send({ received: true });
    }

    try {
      const headers = request.headers as Record<string, string>;
      const rawBody = (request as any).rawBody ?? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body));

      const isValid = await provider.verifyWebhook(headers, rawBody);
      if (!isValid) {
        appLogger.warn('[Webhook] PayPlus webhook verification failed');
        // Still return 200 to prevent retries
        return reply.status(200).send({ received: true });
      }

      const event = provider.parseWebhookEvent(request.body as Record<string, unknown>);

      // Note: Primary verification is HMAC signature check above.
      // Session existence is validated inside handlePaymentSuccess/handlePaymentFailure.

      appLogger.info({ eventType: event.type, providerSessionId: event.providerSessionId }, '[Webhook] PayPlus event received');

      await this.dispatchEvent(event);
    } catch (err) {
      appLogger.error({ err }, '[Webhook] Error processing PayPlus webhook');
    }

    // Always return 200 to prevent provider retries
    return reply.status(200).send({ received: true });
  }

  async handlePayPal(request: FastifyRequest, reply: FastifyReply) {
    const provider = this.providers.get('paypal');
    if (!provider) {
      appLogger.error('[Webhook] PayPal provider not configured');
      return reply.status(200).send({ received: true });
    }

    try {
      const headers = request.headers as Record<string, string>;
      const rawBody = (request as any).rawBody ?? (typeof request.body === 'string' ? request.body : JSON.stringify(request.body));

      const isValid = await provider.verifyWebhook(headers, rawBody);
      if (!isValid) {
        appLogger.warn('[Webhook] PayPal webhook verification failed');
        return reply.status(200).send({ received: true });
      }

      const event = provider.parseWebhookEvent(request.body as Record<string, unknown>);
      appLogger.info({ eventType: event.type, providerSessionId: event.providerSessionId }, '[Webhook] PayPal event received');

      await this.dispatchEvent(event);
    } catch (err) {
      appLogger.error({ err }, '[Webhook] Error processing PayPal webhook');
    }

    return reply.status(200).send({ received: true });
  }

  private async dispatchEvent(event: import('./payment-providers/provider.interface.js').WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'payment_success':
        await this.checkoutService.handlePaymentSuccess(event);
        break;
      case 'payment_failure':
        await this.checkoutService.handlePaymentFailure(event);
        break;
      case 'subscription_suspended':
        await this.checkoutService.handleSubscriptionSuspended(event);
        break;
      case 'subscription_canceled':
        // Provider-side cancellation — log but don't take action
        // (the user manages cancellation through our UI which schedules a downgrade)
        appLogger.info({ event }, '[Webhook] Subscription canceled by provider');
        break;
    }
  }
}
