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
    phoneNumberId?: string,
    wabaId?: string,
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

    // 2. If WABA/phone not provided (reconnection flow), discover via Graph API
    let resolvedWabaId = wabaId;
    let resolvedPhoneNumberId = phoneNumberId;

    if (!resolvedWabaId || !resolvedPhoneNumberId) {
      const appToken = `${env.META_APP_ID}|${env.META_APP_SECRET}`;

      // Inspect token to get granular scopes with target WABA IDs
      const debugRes = await fetch(
        `https://graph.facebook.com/v22.0/debug_token?input_token=${accessToken}`,
        { headers: { Authorization: `Bearer ${appToken}` } },
      );
      const debugData = (await debugRes.json()) as {
        data?: { user_id?: string; granular_scopes?: Array<{ scope: string; target_ids?: string[] }> };
      };

      const wabaScope = debugData.data?.granular_scopes?.find((s) => s.scope === 'whatsapp_business_management');
      if (!resolvedWabaId && wabaScope?.target_ids?.[0]) {
        resolvedWabaId = wabaScope.target_ids[0];
      }

      // Fallback: check system user's assigned WABAs
      if (!resolvedWabaId && debugData.data?.user_id) {
        const wabaRes = await fetch(
          `https://graph.facebook.com/v22.0/${debugData.data.user_id}/assigned_whatsapp_business_accounts`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const wabaJson = await wabaRes.json() as { data?: Array<{ id: string }> };
        if (wabaJson.data?.[0]) {
          resolvedWabaId = wabaJson.data[0].id;
        }
      }

      // Get phone numbers from the WABA
      if (resolvedWabaId && !resolvedPhoneNumberId) {
        const phonesRes = await fetch(
          `https://graph.facebook.com/v22.0/${resolvedWabaId}/phone_numbers`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const phonesJson = await phonesRes.json() as { data?: Array<{ id: string; display_phone_number: string }> };
        if (phonesJson.data?.[0]) {
          resolvedPhoneNumberId = phonesJson.data[0].id;
        }
      }

      if (!resolvedWabaId || !resolvedPhoneNumberId) {
        appLogger.error({ storeId, resolvedWabaId, resolvedPhoneNumberId }, '[WHATSAPP] WABA discovery failed — business may not have a WhatsApp account set up');
        throw new Error('No WhatsApp Business Account found. Please complete the WhatsApp setup in Meta Business Manager first.');
      }

      appLogger.info({ storeId, resolvedWabaId, resolvedPhoneNumberId }, '[WHATSAPP] Discovered WABA/phone from Graph API');
    }

    // 3. Register phone number
    const registerRes = await fetch(`https://graph.facebook.com/v22.0/${resolvedPhoneNumberId}/register`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', pin: '000000' }),
    });
    if (!registerRes.ok) {
      const err = await registerRes.text();
      appLogger.warn({ storeId, phoneNumberId: resolvedPhoneNumberId, err }, '[WHATSAPP] Phone registration failed (may already be registered)');
    }

    // 4. Subscribe WABA to app
    const subscribeRes = await fetch(`https://graph.facebook.com/v22.0/${resolvedWabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!subscribeRes.ok) {
      const err = await subscribeRes.text();
      appLogger.warn({ storeId, wabaId: resolvedWabaId, err }, '[WHATSAPP] WABA subscription failed');
    }

    // 5. Save config
    await WhatsAppRepository.upsert(storeId, resolvedPhoneNumberId, accessToken, resolvedWabaId);

    appLogger.info({ storeId, phoneNumberId: resolvedPhoneNumberId, wabaId: resolvedWabaId }, '[WHATSAPP] Store connected successfully');
  }

  async disconnect(storeId: number) {
    await WhatsAppRepository.delete(storeId);
    appLogger.info({ storeId }, '[WHATSAPP] Store disconnected');
  }
}
