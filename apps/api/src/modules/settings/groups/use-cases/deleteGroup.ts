import type { IGroupsRepository } from '../groups.repository.js';
import { NotFoundError, ForbiddenError } from '../../../../core/errors/app-error.js';

export class DeleteGroupUseCase {
  constructor(private groupsRepository: IGroupsRepository) {}

  async execute(groupId: string, userId: string): Promise<void> {
    const group = await this.groupsRepository.findById(groupId);
    if (!group) throw new NotFoundError('Group not found');
    if (group.isDefault) throw new ForbiddenError('Default groups cannot be deleted');
    if (group.userId !== userId) throw new ForbiddenError('Not authorized to delete this group');

    await this.groupsRepository.delete(groupId);
  }
}
