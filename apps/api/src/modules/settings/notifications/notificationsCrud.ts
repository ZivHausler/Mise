import { PgNotifPrefsRepository } from './notifications.repository.js';
import type { NotificationPreference } from '../settings.types.js';

export class NotificationsCrud {
  static async getAll(userId: string): Promise<NotificationPreference[]> {
    return PgNotifPrefsRepository.findAll(userId);
  }
}
