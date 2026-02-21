import type { FastifyRequest, FastifyReply } from 'fastify';
import { GroupsService } from './groups.service.js';
import { createGroupSchema, updateGroupSchema } from '../settings.types.js';

export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const groups = await this.groupsService.listGroups(storeId);
    return reply.send({ success: true, data: groups });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const data = createGroupSchema.parse(request.body);
    const group = await this.groupsService.createGroup(storeId, data);
    return reply.status(201).send({ success: true, data: group });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    const data = updateGroupSchema.parse(request.body);
    const group = await this.groupsService.updateGroup(Number(id), storeId, data);
    return reply.send({ success: true, data: group });
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { id } = request.params as { id: string };
    await this.groupsService.deleteGroup(Number(id), storeId);
    return reply.status(204).send();
  }
}
