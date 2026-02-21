import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../../src/modules/settings/profile/profile.service.js';
import { NotFoundError } from '../../../src/core/errors/app-error.js';

vi.mock('../../../src/modules/settings/profile/profileCrud.js', () => ({
  ProfileCrud: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

import { ProfileCrud } from '../../../src/modules/settings/profile/profileCrud.js';

const createProfile = (overrides?: any) => ({
  id: 1,
  email: 'baker@mise.com',
  name: 'Test Baker',
  phone: '054-1234567',
  isAdmin: false,
  ...overrides,
});

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProfileService();
  });

  describe('getProfile', () => {
    it('should return profile when user found', async () => {
      const profile = createProfile();
      vi.mocked(ProfileCrud.getById).mockResolvedValue(profile);

      const result = await service.getProfile(1);
      expect(result).toEqual(profile);
      expect(ProfileCrud.getById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError when user not found', async () => {
      vi.mocked(ProfileCrud.getById).mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update profile when user exists', async () => {
      const profile = createProfile();
      vi.mocked(ProfileCrud.getById).mockResolvedValue(profile);
      vi.mocked(ProfileCrud.update).mockResolvedValue({ ...profile, name: 'New Name' });

      const result = await service.updateProfile(1, { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundError when user not found', async () => {
      vi.mocked(ProfileCrud.getById).mockResolvedValue(null);

      await expect(service.updateProfile(999, { name: 'x' })).rejects.toThrow(NotFoundError);
    });
  });
});
