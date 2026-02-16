import type { FastifyRequest, FastifyReply } from 'fastify';
import { GroupsService } from './groups.service.js';
import { createGroupSchema, updateGroupSchema } from '../settings.types.js';

export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const groups = await this.groupsService.listGroups(userId);
    return reply.send({ success: true, data: groups });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const data = createGroupSchema.parse(request.body);
    const group = await this.groupsService.createGroup(userId, data);
    return reply.status(201).send({ success: true, data: group });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const { id } = request.params as { id: string };
    const data = updateGroupSchema.parse(request.body);
    const group = await this.groupsService.updateGroup(id, userId, data);
    return reply.send({ success: true, data: group });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const { id } = request.params as { id: string };
    await this.groupsService.deleteGroup(id, userId);
    return reply.status(204).send();
  }
}
