import type { INotifPrefsRepository } from './notifications.repository.js';
import type { IAuthRepository } from '../../auth/auth.repository.js';
import type { NotificationPreference, UpdateNotificationPrefsDTO } from '../settings.types.js';
import { GetNotificationPreferencesUseCase } from './use-cases/getNotificationPreferences.js';
import { UpdateNotificationPreferencesUseCase } from './use-cases/updateNotificationPreferences.js';

export class NotificationsService {
  private getPrefsUseCase: GetNotificationPreferencesUseCase;
  private updatePrefsUseCase: UpdateNotificationPreferencesUseCase;

  constructor(
    private notifPrefsRepository: INotifPrefsRepository,
    private authRepository: IAuthRepository,
  ) {
    this.getPrefsUseCase = new GetNotificationPreferencesUseCase(notifPrefsRepository);
    this.updatePrefsUseCase = new UpdateNotificationPreferencesUseCase(notifPrefsRepository, authRepository);
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.getPrefsUseCase.execute(userId);
  }

  async updatePreferences(userId: string, data: UpdateNotificationPrefsDTO): Promise<NotificationPreference[]> {
    return this.updatePrefsUseCase.execute(userId, data);
  }
}
