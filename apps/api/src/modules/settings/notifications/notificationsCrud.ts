import { PgNotifPrefsRepository } from './notifications.repository.js';
import type { NotificationPreference } from '../settings.types.js';

export class NotificationsCrud {
  static async getAll(userId: number): Promise<NotificationPreference[]> {
    return PgNotifPrefsRepository.findAll(userId);
  }
}
