import { PgGroupsRepository } from './groups.repository.js';
import type { CreateGroupDTO, Group, UpdateGroupDTO } from '../settings.types.js';
import { NotFoundError, ForbiddenError } from '../../../core/errors/app-error.js';

export class GroupsCrud {
  static async create(storeId: string, data: CreateGroupDTO): Promise<Group> {
    return PgGroupsRepository.create(storeId, data);
  }

  static async getById(id: string): Promise<Group | null> {
    return PgGroupsRepository.findById(id);
  }

  static async getAll(storeId: string): Promise<Group[]> {
    return PgGroupsRepository.findAll(storeId);
  }

  static async update(groupId: string, storeId: string, data: UpdateGroupDTO): Promise<Group> {
    const group = await PgGroupsRepository.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');
    if (group.isDefault) throw new ForbiddenError('Default groups cannot be modified');
    if (group.storeId !== storeId) throw new ForbiddenError('Not authorized to modify this group');
    return PgGroupsRepository.update(groupId, data);
  }

  static async delete(groupId: string, storeId: string): Promise<void> {
    const group = await PgGroupsRepository.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');
    if (group.isDefault) throw new ForbiddenError('Default groups cannot be deleted');
    if (group.storeId !== storeId) throw new ForbiddenError('Not authorized to delete this group');
    await PgGroupsRepository.delete(groupId);
  }
}
