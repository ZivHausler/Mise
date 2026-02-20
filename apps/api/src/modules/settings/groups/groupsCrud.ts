import { PgGroupsRepository } from './groups.repository.js';
import type { CreateGroupDTO, Group, UpdateGroupDTO } from '../settings.types.js';

export class GroupsCrud {
  static async create(storeId: string, data: CreateGroupDTO): Promise<Group> {
    return PgGroupsRepository.create(storeId, data);
  }

  static async getById(id: string, storeId: string): Promise<Group | null> {
    return PgGroupsRepository.findById(id, storeId);
  }

  static async getAll(storeId: string): Promise<Group[]> {
    return PgGroupsRepository.findAll(storeId);
  }

  static async update(groupId: string, storeId: string, data: UpdateGroupDTO): Promise<Group> {
    return PgGroupsRepository.update(groupId, storeId, data);
  }

  static async delete(groupId: string, storeId: string): Promise<void> {
    await PgGroupsRepository.delete(groupId, storeId);
  }
}
