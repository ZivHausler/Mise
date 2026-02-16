import type { IGroupsRepository } from './groups.repository.js';
import type { Group, CreateGroupDTO, UpdateGroupDTO } from '../settings.types.js';
import { ListGroupsUseCase } from './use-cases/listGroups.js';
import { CreateGroupUseCase } from './use-cases/createGroup.js';
import { UpdateGroupUseCase } from './use-cases/updateGroup.js';
import { DeleteGroupUseCase } from './use-cases/deleteGroup.js';

export class GroupsService {
  private listGroupsUseCase: ListGroupsUseCase;
  private createGroupUseCase: CreateGroupUseCase;
  private updateGroupUseCase: UpdateGroupUseCase;
  private deleteGroupUseCase: DeleteGroupUseCase;

  constructor(private groupsRepository: IGroupsRepository) {
    this.listGroupsUseCase = new ListGroupsUseCase(groupsRepository);
    this.createGroupUseCase = new CreateGroupUseCase(groupsRepository);
    this.updateGroupUseCase = new UpdateGroupUseCase(groupsRepository);
    this.deleteGroupUseCase = new DeleteGroupUseCase(groupsRepository);
  }

  async listGroups(userId: string): Promise<Group[]> {
    return this.listGroupsUseCase.execute(userId);
  }

  async createGroup(userId: string, data: CreateGroupDTO): Promise<Group> {
    return this.createGroupUseCase.execute(userId, data);
  }

  async updateGroup(groupId: string, userId: string, data: UpdateGroupDTO): Promise<Group> {
    return this.updateGroupUseCase.execute(groupId, userId, data);
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    return this.deleteGroupUseCase.execute(groupId, userId);
  }
}
