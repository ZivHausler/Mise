import type { NotificationPreference, UpdateNotificationPrefsDTO } from '../settings.types.js';
import { NotificationsCrud } from './notificationsCrud.js';
import { UpdateNotificationPreferencesUseCase } from './use-cases/updateNotificationPreferences.js';

export class NotificationsService {
  private updatePrefsUseCase: UpdateNotificationPreferencesUseCase;

  constructor() {
    this.updatePrefsUseCase = new UpdateNotificationPreferencesUseCase();
  }

  async getPreferences(userId: number): Promise<NotificationPreference[]> {
    return NotificationsCrud.getAll(userId);
  }

  async updatePreferences(userId: number, data: UpdateNotificationPrefsDTO): Promise<NotificationPreference[]> {
    return this.updatePrefsUseCase.execute(userId, data);
  }
}
