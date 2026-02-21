import { PgGroupsRepository } from './groups.repository.js';
import type { CreateGroupDTO, Group, UpdateGroupDTO } from '../settings.types.js';

export class GroupsCrud {
  static async create(storeId: number, data: CreateGroupDTO): Promise<Group> {
    return PgGroupsRepository.create(storeId, data);
  }

  static async getById(id: number, storeId: number): Promise<Group | null> {
    return PgGroupsRepository.findById(id, storeId);
  }

  static async getAll(storeId: number): Promise<Group[]> {
    return PgGroupsRepository.findAll(storeId);
  }

  static async update(groupId: number, storeId: number, data: UpdateGroupDTO): Promise<Group> {
    return PgGroupsRepository.update(groupId, storeId, data);
  }

  static async delete(groupId: number, storeId: number): Promise<void> {
    await PgGroupsRepository.delete(groupId, storeId);
  }
}
