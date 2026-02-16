import type { INotifPrefsRepository } from '../notifications.repository.js';
import type { NotificationPreference } from '../../settings.types.js';

export class GetNotificationPreferencesUseCase {
  constructor(private notifPrefsRepository: INotifPrefsRepository) {}

  async execute(userId: string): Promise<NotificationPreference[]> {
    return this.notifPrefsRepository.findAll(userId);
  }
}
