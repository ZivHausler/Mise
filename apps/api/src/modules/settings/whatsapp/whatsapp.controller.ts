import type { FastifyRequest, FastifyReply } from 'fastify';
import { WhatsAppService } from './whatsapp.service.js';
import { ForbiddenError } from '../../../core/errors/app-error.js';
import { StoreRole } from '../../stores/store.types.js';

export class WhatsAppController {
  constructor(private whatsAppService: WhatsAppService) {}

  private assertOwnerOrAdmin(request: FastifyRequest) {
    const user = request.currentUser!;
    if (user.isAdmin) return;
    if (user.storeRole === StoreRole.OWNER) return;
    throw new ForbiddenError('Only store owners can manage WhatsApp integration.');
  }

  async getConfig(request: FastifyRequest, reply: FastifyReply) {
    this.assertOwnerOrAdmin(request);
    const storeId = request.currentUser!.storeId!;
    const config = await this.whatsAppService.getConfig(storeId);
    return reply.send({ success: true, data: config });
  }

  async connect(request: FastifyRequest, reply: FastifyReply) {
    this.assertOwnerOrAdmin(request);
    const storeId = request.currentUser!.storeId!;
    const { code, phoneNumberId, wabaId } = request.body as {
      code: string;
      phoneNumberId: string;
      wabaId: string;
    };

    await this.whatsAppService.handleSignupCallback(storeId, code, phoneNumberId, wabaId);
    const config = await this.whatsAppService.getConfig(storeId);
    return reply.send({ success: true, data: config });
  }

  async disconnect(request: FastifyRequest, reply: FastifyReply) {
    this.assertOwnerOrAdmin(request);
    const storeId = request.currentUser!.storeId!;
    await this.whatsAppService.disconnect(storeId);
    return reply.send({ success: true, data: null });
  }
}
