import type { UseCase } from '../../../../core/use-case.js';
import { PgNotifPrefsRepository } from '../notifications.repository.js';
import { PgAuthRepository } from '../../../auth/auth.repository.js';
import type { NotificationPreference, UpdateNotificationPrefsDTO } from '../../settings.types.js';
import { ValidationError } from '../../../../core/errors/app-error.js';

export class UpdateNotificationPreferencesUseCase implements UseCase<NotificationPreference[], [string, UpdateNotificationPrefsDTO]> {
  async execute(userId: string, data: UpdateNotificationPrefsDTO): Promise<NotificationPreference[]> {
    // Check if user has phone before allowing SMS
    const hasSmsEnabled = data.preferences.some((p) => p.sms);
    if (hasSmsEnabled) {
      const user = await PgAuthRepository.findById(userId);
      if (!user?.phone) {
        throw new ValidationError('Cannot enable SMS notifications without a phone number');
      }
    }

    const prefs = data.preferences.map((p) => ({
      eventType: p.eventType,
      email: p.email,
      push: p.push,
      sms: p.sms,
    }));

    return PgNotifPrefsRepository.upsert(userId, prefs);
  }
}
