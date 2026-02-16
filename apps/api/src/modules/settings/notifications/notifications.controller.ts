import type { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationsService } from './notifications.service.js';
import { updateNotificationPrefsSchema } from '../settings.types.js';

export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  async get(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const prefs = await this.notificationsService.getPreferences(userId);
    return reply.send({ success: true, data: prefs });
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const data = updateNotificationPrefsSchema.parse(request.body);
    const prefs = await this.notificationsService.updatePreferences(userId, data);
    return reply.send({ success: true, data: prefs });
  }
}
