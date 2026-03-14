import type { FastifyRequest, FastifyReply } from 'fastify';
import type { StoreService } from './store.service.js';
import { StoreRole } from './store.types.js';
import { createStoreSchema, inviteSchema, updateThemeSchema, updateBusinessInfoSchema, updateSlugSchema, updateStorefrontEnabledSchema, checkSlugSchema, brandingUploadUrlSchema, updateBrandingSchema } from './store.schema.js';
import { ForbiddenError, ValidationError } from '../../core/errors/app-error.js';
import { ErrorCode } from '@mise/shared';
import { generateBrandingUploadUrl, validateStoreOwnership, isManagedUrl } from '../../core/storage/gcs.js';

export class StoreController {
  constructor(private storeService: StoreService) {}

  async createStore(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const { inviteToken, ...storeData } = request.body as Record<string, unknown>;
    const data = createStoreSchema.parse(storeData);
    const result = await this.storeService.createStore(userId, email, data, inviteToken as string | undefined);
    return reply.status(201).send({ success: true, data: result });
  }

  async adminCreateStoreInvite(request: FastifyRequest, reply: FastifyReply) {
    const { email } = request.body as { email: string };
    if (!email) throw new ValidationError('Email is required', ErrorCode.STORE_EMAIL_REQUIRED);
    const result = await this.storeService.createCreateStoreInvitation(email);
    return reply.status(201).send({ success: true, data: { token: result.token, inviteLink: result.inviteLink } });
  }

  async getMyStores(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const stores = await this.storeService.getMyStores(userId);
    return reply.send({ success: true, data: stores });
  }

  async selectStore(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const isAdmin = request.currentUser!.isAdmin;
    const { storeId } = request.body as { storeId: number };
    const result = await this.storeService.selectStore(userId, email, storeId, isAdmin);
    return reply.send({ success: true, data: result });
  }

  async getAllStores(request: FastifyRequest, reply: FastifyReply) {
    const stores = await this.storeService.getAllStores();
    return reply.send({ success: true, data: stores });
  }

  async getMembers(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const members = await this.storeService.getStoreMembers(storeId);
    return reply.send({ success: true, data: members });
  }

  async getPendingInvitations(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const invitations = await this.storeService.getPendingInvitations(storeId);
    return reply.send({ success: true, data: invitations });
  }

  async updateMemberRole(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    if (!storeRole) throw new ValidationError('No store role assigned', ErrorCode.STORE_NO_ROLE);
    const callerUserId = request.currentUser!.userId;
    const targetUserId = Number(request.params.userId);
    const { role } = request.body as { role: number };
    if (role !== 2 && role !== 3) throw new ValidationError('Role must be 2 (Manager) or 3 (Employee)', ErrorCode.VALIDATION_ERROR);
    const isAdmin = request.currentUser!.isAdmin;
    await this.storeService.updateMemberRole(storeId, storeRole as StoreRole, callerUserId, targetUserId, role as StoreRole, isAdmin);
    return reply.send({ success: true });
  }

  async removeMember(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    if (!storeRole) throw new ValidationError('No store role assigned', ErrorCode.STORE_NO_ROLE);
    const callerUserId = request.currentUser!.userId;
    const targetUserId = Number(request.params.userId);
    const isAdmin = request.currentUser!.isAdmin;
    await this.storeService.removeMember(storeId, storeRole as StoreRole, callerUserId, targetUserId, isAdmin);
    return reply.send({ success: true });
  }

  async sendInvite(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    if (!storeRole) throw new ValidationError('No store role assigned', ErrorCode.STORE_NO_ROLE);

    const data = inviteSchema.parse(request.body);
    const isAdmin = request.currentUser!.isAdmin;
    const invitation = await this.storeService.sendInvite(storeId, storeRole as StoreRole, data.email, data.role as StoreRole, isAdmin);
    return reply.status(201).send({ success: true, data: { token: invitation.token, inviteLink: invitation.inviteLink } });
  }

  async revokeInvitation(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    if (!storeRole) throw new ValidationError('No store role assigned', ErrorCode.STORE_NO_ROLE);

    const isAdmin = request.currentUser!.isAdmin;
    const invitationId = Number(request.params.id);
    await this.storeService.revokeInvitation(storeId, storeRole as StoreRole, invitationId, isAdmin);
    return reply.send({ success: true });
  }

  async getCurrent(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const store = await this.storeService.getStoreById(storeId);
    return reply.send({ success: true, data: store });
  }

  async updateTheme(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    const isAdmin = request.currentUser!.isAdmin;
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can change the theme', ErrorCode.STORE_NO_ACCESS);
    }
    const data = updateThemeSchema.parse(request.body);
    await this.storeService.updateTheme(storeId, data);
    return reply.send({ success: true });
  }

  async updateBusinessInfo(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    const isAdmin = request.currentUser!.isAdmin;
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can update business info', ErrorCode.STORE_NO_ACCESS);
    }
    const data = updateBusinessInfoSchema.parse(request.body);
    const store = await this.storeService.updateBusinessInfo(storeId, data);
    return reply.send({ success: true, data: store });
  }

  async updateSlug(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const isAdmin = request.currentUser!.isAdmin;
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can update the slug', ErrorCode.STORE_NO_ACCESS);
    }
    const { slug } = updateSlugSchema.parse(request.body);
    await this.storeService.updateSlug(storeId, slug);
    return reply.send({ success: true });
  }

  async updateStorefrontEnabled(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    const isAdmin = request.currentUser!.isAdmin;
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can toggle storefront', ErrorCode.STORE_NO_ACCESS);
    }
    const { enabled } = updateStorefrontEnabledSchema.parse(request.body);
    await this.storeService.updateStorefrontEnabled(storeId, enabled);
    return reply.send({ success: true });
  }

  async checkSlugAvailability(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const { slug } = checkSlugSchema.parse(request.query);
    const result = await this.storeService.checkSlugAvailability(slug, storeId);
    return reply.send({ success: true, data: result });
  }

  async generateBrandingUploadUrl(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    const isAdmin = request.currentUser!.isAdmin;
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can upload branding images', ErrorCode.STORE_NO_ACCESS);
    }
    const { type, mimeType } = brandingUploadUrlSchema.parse(request.body);
    const result = await generateBrandingUploadUrl(storeId, type, mimeType);
    return reply.send({ success: true, data: result });
  }

  async updateBranding(request: FastifyRequest, reply: FastifyReply) {
    const storeId = request.currentUser!.storeId!;
    const storeRole = request.currentUser!.storeRole;
    const isAdmin = request.currentUser!.isAdmin;
    if (storeRole !== StoreRole.OWNER && !isAdmin) {
      throw new ForbiddenError('Only store owners can update branding', ErrorCode.STORE_NO_ACCESS);
    }
    const data = updateBrandingSchema.parse(request.body);

    // Validate branding URLs: only allow managed URLs (GCS/local uploads) or clearing the value
    if (data.logoUrl) {
      if (!isManagedUrl(data.logoUrl)) {
        throw new ValidationError('External URLs are not allowed for branding assets. Please upload an image instead.', ErrorCode.VALIDATION_ERROR);
      }
      if (!validateStoreOwnership(data.logoUrl, storeId)) {
        throw new ForbiddenError('Invalid logo URL', ErrorCode.STORE_NO_ACCESS);
      }
    }
    if (data.bannerUrl) {
      if (!isManagedUrl(data.bannerUrl)) {
        throw new ValidationError('External URLs are not allowed for branding assets. Please upload an image instead.', ErrorCode.VALIDATION_ERROR);
      }
      if (!validateStoreOwnership(data.bannerUrl, storeId)) {
        throw new ForbiddenError('Invalid banner URL', ErrorCode.STORE_NO_ACCESS);
      }
    }

    const store = await this.storeService.updateBranding(storeId, data);
    return reply.send({ success: true, data: store });
  }

  async validateInvite(request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) {
    const { token } = request.params;
    const result = await this.storeService.validateInvite(token);
    return reply.send({ success: true, data: result });
  }

  async acceptInvite(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.currentUser!.userId;
    const email = request.currentUser!.email;
    const { token } = request.body as { token: string };

    const { storeId, role } = await this.storeService.acceptInvite(userId, email, token);
    const jwt = this.storeService.generateTokenWithStore(userId, email, storeId, role);
    const stores = await this.storeService.getMyStores(userId);

    return reply.send({ success: true, data: { token: jwt, storeId, role, stores } });
  }
}
