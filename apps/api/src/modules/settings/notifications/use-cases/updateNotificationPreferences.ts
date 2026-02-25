import type { UseCase } from '../../../../core/use-case.js';
import { PgNotifPrefsRepository } from '../notifications.repository.js';
import { PgAuthRepository } from '../../../auth/auth.repository.js';
import type { NotificationPreference, UpdateNotificationPrefsDTO } from '../../settings.types.js';
import { ValidationError } from '../../../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';

export class UpdateNotificationPreferencesUseCase implements UseCase<NotificationPreference[], [number, UpdateNotificationPrefsDTO]> {
  async execute(userId: number, data: UpdateNotificationPrefsDTO): Promise<NotificationPreference[]> {
    // Check if user has phone before allowing SMS or WhatsApp
    const needsPhone = data.preferences.some((p) => p.sms || p.whatsapp);
    if (needsPhone) {
      const user = await PgAuthRepository.findById(userId);
      if (!user?.phone) {
        throw new ValidationError('Cannot enable SMS or WhatsApp notifications without a phone number', ErrorCode.NOTIFICATION_SMS_NO_PHONE);
      }
    }

    const prefs = data.preferences.map((p) => ({
      eventType: p.eventType,
      email: p.email,
      push: p.push,
      sms: p.sms,
      whatsapp: p.whatsapp,
    }));

    return PgNotifPrefsRepository.upsert(userId, prefs);
  }
}
