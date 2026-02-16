import type { IGroupsRepository } from '../groups.repository.js';
import type { UpdateGroupDTO, Group } from '../../settings.types.js';
import { NotFoundError, ForbiddenError } from '../../../../core/errors/app-error.js';

export class UpdateGroupUseCase {
  constructor(private groupsRepository: IGroupsRepository) {}

  async execute(groupId: string, userId: string, data: UpdateGroupDTO): Promise<Group> {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');
    if (group.isDefault) throw new ForbiddenError('Default groups cannot be modified');
    if (group.userId !== userId) throw new ForbiddenError('Not authorized to modify this group');

    return this.groupsRepository.update(groupId, data);
  }
}
