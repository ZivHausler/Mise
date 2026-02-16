import type { IGroupsRepository } from '../groups.repository.js';
import type { Group } from '../../settings.types.js';

export class ListGroupsUseCase {
  constructor(private groupsRepository: IGroupsRepository) {}

  async execute(userId: string): Promise<Group[]> {
    return this.groupsRepository.findAll(userId);
  }
}
