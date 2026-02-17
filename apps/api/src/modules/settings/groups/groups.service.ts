import type { Group, CreateGroupDTO, UpdateGroupDTO } from '../settings.types.js';
import { GroupsCrud } from './groupsCrud.js';

export class GroupsService {
  async listGroups(storeId: string): Promise<Group[]> {
    return GroupsCrud.getAll(storeId);
  }

  async createGroup(storeId: string, data: CreateGroupDTO): Promise<Group> {
    return GroupsCrud.create(storeId, data);
  }

  async updateGroup(groupId: string, storeId: string, data: UpdateGroupDTO): Promise<Group> {
    return GroupsCrud.update(groupId, storeId, data);
  }

  async deleteGroup(groupId: string, storeId: string): Promise<void> {
    return GroupsCrud.delete(groupId, storeId);
  }
}
