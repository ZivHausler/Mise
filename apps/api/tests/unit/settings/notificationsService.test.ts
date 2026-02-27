import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/settings/notifications/notificationsCrud.js', () => ({
  NotificationsCrud: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../../src/modules/settings/notifications/notifications.repository.js', () => ({
  PgNotifPrefsRepository: {
    upsert: vi.fn(),
  },
}));

vi.mock('../../../src/modules/auth/auth.repository.js', () => ({
  PgAuthRepository: {
    findById: vi.fn(),
  },
}));

import { NotificationsCrud } from '../../../src/modules/settings/notifications/notificationsCrud.js';
import { PgNotifPrefsRepository } from '../../../src/modules/settings/notifications/notifications.repository.js';
import { PgAuthRepository } from '../../../src/modules/auth/auth.repository.js';
import { NotificationsService } from '../../../src/modules/settings/notifications/notifications.service.js';
import { UpdateNotificationPreferencesUseCase } from '../../../src/modules/settings/notifications/use-cases/updateNotificationPreferences.js';

const USER_ID = 1;

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService();
  });

  describe('getPreferences', () => {
    it('should return user preferences', async () => {
      const prefs = [{ eventType: 'order_created', email: true, push: false, sms: false, whatsapp: false }];
      vi.mocked(NotificationsCrud.getAll).mockResolvedValue(prefs as any);

      const result = await service.getPreferences(USER_ID);
      expect(result).toEqual(prefs);
    });
  });
});

describe('UpdateNotificationPreferencesUseCase', () => {
  let useCase: UpdateNotificationPreferencesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new UpdateNotificationPreferencesUseCase();
  });

  it('should update preferences when no SMS/WhatsApp enabled', async () => {
    const prefs = [{ eventType: 'order_created', email: true, push: false, sms: false, whatsapp: false }];
    vi.mocked(PgNotifPrefsRepository.upsert).mockResolvedValue(prefs as any);

    const result = await useCase.execute(USER_ID, { preferences: prefs });
    expect(result).toEqual(prefs);
  });

  it('should throw ValidationError when enabling SMS without phone', async () => {
    vi.mocked(PgAuthRepository.findById).mockResolvedValue({ id: 1, phone: undefined } as any);

    await expect(
      useCase.execute(USER_ID, {
        preferences: [{ eventType: 'order_created', email: true, push: false, sms: true, whatsapp: false }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError when enabling WhatsApp without phone', async () => {
    vi.mocked(PgAuthRepository.findById).mockResolvedValue({ id: 1, phone: null } as any);

    await expect(
      useCase.execute(USER_ID, {
        preferences: [{ eventType: 'order_created', email: false, push: false, sms: false, whatsapp: true }],
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('should allow SMS when user has phone number', async () => {
    vi.mocked(PgAuthRepository.findById).mockResolvedValue({ id: 1, phone: '054-1234567' } as any);
    const prefs = [{ eventType: 'order_created', email: true, push: false, sms: true, whatsapp: false }];
    vi.mocked(PgNotifPrefsRepository.upsert).mockResolvedValue(prefs as any);

    const result = await useCase.execute(USER_ID, { preferences: prefs });
    expect(result).toEqual(prefs);
  });

  it('should not check phone when no SMS/WhatsApp preferences', async () => {
    const prefs = [{ eventType: 'order_created', email: true, push: true, sms: false, whatsapp: false }];
    vi.mocked(PgNotifPrefsRepository.upsert).mockResolvedValue(prefs as any);

    await useCase.execute(USER_ID, { preferences: prefs });
    expect(PgAuthRepository.findById).not.toHaveBeenCalled();
  });
});
