import type { Group, CreateGroupDTO, UpdateGroupDTO } from '../settings.types.js';
import { GroupsCrud } from './groupsCrud.js';
import { NotFoundError, ForbiddenError } from '../../../core/errors/app-error.js';

export class GroupsService {
  async listGroups(storeId: number): Promise<Group[]> {
    return GroupsCrud.getAll(storeId);
  }

  async createGroup(storeId: number, data: CreateGroupDTO): Promise<Group> {
    return GroupsCrud.create(storeId, data);
  }

  async updateGroup(groupId: number, storeId: number, data: UpdateGroupDTO): Promise<Group> {
    const group = await GroupsCrud.getById(groupId, storeId);
    if (!group) throw new NotFoundError('Group not found');
    if (group.isDefault) throw new ForbiddenError('Default groups cannot be modified');
    if (group.storeId !== storeId) throw new ForbiddenError('Not authorized to modify this group');
    return GroupsCrud.update(groupId, storeId, data);
  }

  async deleteGroup(groupId: number, storeId: number): Promise<void> {
    const group = await GroupsCrud.getById(groupId, storeId);
    if (!group) throw new NotFoundError('Group not found');
    if (group.isDefault) throw new ForbiddenError('Default groups cannot be deleted');
    if (group.storeId !== storeId) throw new ForbiddenError('Not authorized to delete this group');
    return GroupsCrud.delete(groupId, storeId);
  }
}
