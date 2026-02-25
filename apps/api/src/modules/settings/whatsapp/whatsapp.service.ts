import { env } from '../../../config/env.js';
import { WhatsAppRepository } from './whatsapp.repository.js';
import { appLogger } from '../../../core/logger/logger.js';

export class WhatsAppService {
  async getConfig(storeId: number) {
    const config = await WhatsAppRepository.findByStoreId(storeId);
    if (!config) return null;

    return {
      connected: true,
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
      createdAt: config.createdAt,
    };
  }

  async handleSignupCallback(
    storeId: number,
    code: string,
    phoneNumberId: string,
    wabaId: string,
  ) {
    // 1. Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${env.META_APP_ID}&client_secret=${env.META_APP_SECRET}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      appLogger.error({ storeId, err }, '[WHATSAPP] Failed to exchange code for token');
      throw new Error('Failed to exchange code for access token');
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // 2. Register phone number
    const registerRes = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', pin: '000000' }),
    });
    if (!registerRes.ok) {
      const err = await registerRes.text();
      appLogger.warn({ storeId, phoneNumberId, err }, '[WHATSAPP] Phone registration failed (may already be registered)');
    }

    // 3. Subscribe WABA to app
    const subscribeRes = await fetch(`https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!subscribeRes.ok) {
      const err = await subscribeRes.text();
      appLogger.warn({ storeId, wabaId, err }, '[WHATSAPP] WABA subscription failed');
    }

    // 4. Save config
    await WhatsAppRepository.upsert(storeId, phoneNumberId, accessToken, wabaId);

    appLogger.info({ storeId, phoneNumberId, wabaId }, '[WHATSAPP] Store connected successfully');
  }

  async disconnect(storeId: number) {
    await WhatsAppRepository.delete(storeId);
    appLogger.info({ storeId }, '[WHATSAPP] Store disconnected');
  }
}
