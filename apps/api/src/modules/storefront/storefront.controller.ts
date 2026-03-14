import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { StorefrontService } from './storefront.service.js';
import { StorefrontAuthService } from './storefront-auth.service.js';
import {
  slugParamSchema, menuQuerySchema, createOrderSchema,
  orderStatusQuerySchema, capturePayPalOrderSchema,
  recipeDetailParamSchema, orderStatusParamSchema, checkoutQuerySchema,
  cancelOrderBodySchema, notificationsQuerySchema, updateProfileSchema,
  createPayPalOrderSchema, langQuerySchema,
} from './storefront.schemas.js';
import { NotFoundError, UnauthorizedError } from '../../core/errors/app-error.js';

const googleAuthBodySchema = z.object({
  idToken: z.string().min(1).max(4096).optional(),
  accessToken: z.string().min(1).max(4096).optional(),
}).refine(data => data.idToken || data.accessToken, {
  message: 'Either idToken or accessToken is required',
});

export class StorefrontController {
  private authService: StorefrontAuthService | null = null;

  constructor(private service: StorefrontService) {}

  setAuthService(authService: StorefrontAuthService) {
    this.authService = authService;
  }

  async discoverStores(req: FastifyRequest, reply: FastifyReply) {
    const { lang } = langQuerySchema.parse(req.query);
    const stores = await this.service.discoverStores(lang);
    return reply.send({ success: true, data: stores });
  }

  async getStoreInfo(req: FastifyRequest, reply: FastifyReply) {
    const { slug } = slugParamSchema.parse(req.params);
    const { lang } = langQuerySchema.parse(req.query);
    const store = await this.service.getStoreBySlug(slug, lang);
    return reply.send({ success: true, data: store });
  }

  async getMenu(req: FastifyRequest, reply: FastifyReply) {
    const { slug } = slugParamSchema.parse(req.params);
    const filters = menuQuerySchema.parse(req.query);
    const items = await this.service.getPublishedMenu(slug, filters);
    return reply.send({ success: true, data: items });
  }

  async getRecipeDetail(req: FastifyRequest, reply: FastifyReply) {
    const { slug, recipeId } = recipeDetailParamSchema.parse(req.params);
    const { lang } = langQuerySchema.parse(req.query);
    const item = await this.service.getRecipeDetail(slug, recipeId, lang);
    return reply.send({ success: true, data: item });
  }

  async createOrder(req: FastifyRequest, reply: FastifyReply) {
    const { slug } = slugParamSchema.parse(req.params);
    const body = createOrderSchema.parse(req.body);

    // Extract optional storefront JWT
    let authenticatedCustomerId: number | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await req.jwtVerify<{ customerId: number; type: string }>();
        if (payload.type === 'storefront') {
          authenticatedCustomerId = payload.customerId;
        }
      } catch {
        // Ignore invalid tokens — order proceeds without linking
      }
    }

    const result = await this.service.createStorefrontOrder(slug, body, authenticatedCustomerId);
    return reply.status(201).send({ success: true, data: result });
  }

  async authenticateWithGoogle(req: FastifyRequest, reply: FastifyReply) {
    const { idToken, accessToken } = googleAuthBodySchema.parse(req.body);
    if (!this.authService) throw new Error('StorefrontAuthService not initialized');
    const result = idToken
      ? await this.authService.authenticateWithGoogle(idToken)
      : await this.authService.authenticateWithGoogleAccessToken(accessToken!);
    return reply.send({
      success: true,
      data: {
        token: result.token,
        customer: {
          id: result.customer.id,
          email: result.customer.email,
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
          phone: result.customer.phone,
          photo: result.customer.photo,
        },
        isProfileComplete: result.isProfileComplete,
      },
    });
  }

  async getAuthProfile(req: FastifyRequest, reply: FastifyReply) {
    let customerId: number;
    try {
      const payload = await req.jwtVerify<{ customerId: number; type: string }>();
      if (payload.type !== 'storefront') {
        throw new Error('Not a storefront token');
      }
      customerId = payload.customerId;
    } catch {
      throw new UnauthorizedError('Invalid or missing token');
    }

    if (!this.authService) throw new Error('StorefrontAuthService not initialized');
    const profile = await this.authService.getProfile(customerId);
    if (!profile) {
      throw new NotFoundError('Customer not found');
    }
    return reply.send({
      success: true,
      data: {
        id: profile.customer.id,
        email: profile.customer.email,
        firstName: profile.customer.firstName,
        lastName: profile.customer.lastName,
        phone: profile.customer.phone,
        photo: profile.customer.photo,
        isProfileComplete: profile.isProfileComplete,
      },
    });
  }

  async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    let customerId: number;
    try {
      const payload = await req.jwtVerify<{ customerId: number; type: string }>();
      if (payload.type !== 'storefront') {
        throw new Error('Not a storefront token');
      }
      customerId = payload.customerId;
    } catch {
      throw new UnauthorizedError('Invalid or missing token');
    }

    if (!this.authService) throw new Error('StorefrontAuthService not initialized');

    const body = updateProfileSchema.parse(req.body);
    const result = await this.authService.updateProfile(customerId, body);

    return reply.send({
      success: true,
      data: {
        customer: {
          id: result.customer.id,
          email: result.customer.email,
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
          phone: result.customer.phone,
          photo: result.customer.photo,
        },
        isProfileComplete: result.isProfileComplete,
      },
    });
  }

  async getOrderStatus(req: FastifyRequest, reply: FastifyReply) {
    const { slug, orderNumber } = orderStatusParamSchema.parse(req.params);
    const { phone } = orderStatusQuerySchema.parse(req.query);
    const status = await this.service.getOrderStatus(slug, orderNumber, phone);
    return reply.send({ success: true, data: status });
  }

  async capturePayPalOrder(req: FastifyRequest, reply: FastifyReply) {
    const { slug } = slugParamSchema.parse(req.params);
    const body = capturePayPalOrderSchema.parse(req.body);
    const result = await this.service.capturePayPalOrder(slug, body.paypalOrderId, body.orderNumber);
    return reply.send({ success: true, data: result });
  }

  async createPayPalOrder(req: FastifyRequest, reply: FastifyReply) {
    const { slug } = slugParamSchema.parse(req.params);
    const body = createPayPalOrderSchema.parse(req.body);
    const result = await this.service.createPayPalOrderOnly(slug, body.items);
    return reply.send({ success: true, data: result });
  }

  async getPayPalCheckoutPage(req: FastifyRequest, reply: FastifyReply) {
    const { slug } = slugParamSchema.parse(req.params);
    const { orderId, amount } = checkoutQuerySchema.parse(req.query);
    const html = await this.service.getPayPalCheckoutHtml(slug, orderId, amount);
    return reply.type('text/html').send(html);
  }

  async cancelOrder(req: FastifyRequest, reply: FastifyReply) {
    const { slug, orderNumber } = orderStatusParamSchema.parse(req.params);
    const { phone, reason } = cancelOrderBodySchema.parse(req.body);
    const result = await this.service.cancelStorefrontOrder(slug, orderNumber, phone, reason);
    return reply.send({ success: true, data: { status: result.status } });
  }

  async getOrderNotifications(req: FastifyRequest, reply: FastifyReply) {
    const { slug, orderNumber } = orderStatusParamSchema.parse(req.params);
    const { phone } = notificationsQuerySchema.parse(req.query);
    const notifications = await this.service.getOrderNotifications(slug, orderNumber, phone);
    return reply.send({ success: true, data: notifications });
  }
}
