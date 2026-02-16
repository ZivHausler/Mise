import type { IGroupsRepository } from '../groups.repository.js';
import type { CreateGroupDTO, Group } from '../../settings.types.js';

export class CreateGroupUseCase {
  constructor(private groupsRepository: IGroupsRepository) {}

  async execute(userId: string, data: CreateGroupDTO): Promise<Group> {
    return this.groupsRepository.create(userId, data);
  }
}
