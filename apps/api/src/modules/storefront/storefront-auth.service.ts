import type { FastifyInstance } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { ValidationError, UnauthorizedError } from '../../core/errors/app-error.js';
import { StorefrontAuthRepository } from './storefront-auth.repository.js';
import type { StorefrontCustomer } from './storefront-auth.repository.js';
import { env } from '../../config/env.js';

export class StorefrontAuthService {
  private oauth2Client: OAuth2Client;

  constructor(private fastify: FastifyInstance) {
    this.oauth2Client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }

  /**
   * Verify Google ID token, upsert global customer, return JWT + profile.
   */
  async authenticateWithGoogle(idToken: string): Promise<{ token: string; customer: StorefrontCustomer; isProfileComplete: boolean }> {
    let payload;
    try {
      // Accept tokens issued for web, iOS, or Android client IDs
      const validAudiences = [
        env.GOOGLE_CLIENT_ID,
        process.env['GOOGLE_IOS_CLIENT_ID'],
        process.env['GOOGLE_ANDROID_CLIENT_ID'],
      ].filter(Boolean) as string[];

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: validAudiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError('Google token verification failed');
    }

    if (!payload?.email || !payload?.sub) {
      throw new ValidationError('Invalid Google token: missing email or subject');
    }

    // Upsert into global customers table
    const customer = await StorefrontAuthRepository.upsertCustomer({
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || null,
      lastName: payload.family_name || null,
      photo: payload.picture ?? null,
    });

    // Sign storefront JWT (7-day expiry)
    const token = this.fastify.jwt.sign(
      { customerId: customer.id, email: customer.email, type: 'storefront' as const, iss: 'storefront' } as any,
      { expiresIn: '7d' },
    );

    return { token, customer, isProfileComplete: this.isProfileComplete(customer) };
  }

  /**
   * Verify Google access token via userinfo endpoint, upsert customer, return JWT + profile.
   */
  async authenticateWithGoogleAccessToken(accessToken: string): Promise<{ token: string; customer: StorefrontCustomer; isProfileComplete: boolean }> {
    let userInfo: { sub: string; email: string; given_name?: string; family_name?: string; name?: string; picture?: string };
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user info');
      userInfo = await response.json() as typeof userInfo;
    } catch {
      throw new UnauthorizedError('Google access token verification failed');
    }

    if (!userInfo.email || !userInfo.sub) {
      throw new ValidationError('Invalid Google token: missing email or subject');
    }

    const customer = await StorefrontAuthRepository.upsertCustomer({
      googleId: userInfo.sub,
      email: userInfo.email,
      firstName: userInfo.given_name || null,
      lastName: userInfo.family_name || null,
      photo: userInfo.picture ?? null,
    });

    const token = this.fastify.jwt.sign(
      { customerId: customer.id, email: customer.email, type: 'storefront' as const, iss: 'storefront' } as any,
      { expiresIn: '7d' },
    );

    return { token, customer, isProfileComplete: this.isProfileComplete(customer) };
  }

  /**
   * Look up a customer by ID (for /auth/me).
   */
  async getProfile(customerId: number): Promise<{ customer: StorefrontCustomer; isProfileComplete: boolean } | null> {
    const customer = await StorefrontAuthRepository.findById(customerId);
    if (!customer) return null;
    return { customer, isProfileComplete: this.isProfileComplete(customer) };
  }

  /**
   * Update customer profile fields with phone normalization.
   */
  async updateProfile(
    customerId: number,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<{ customer: StorefrontCustomer; isProfileComplete: boolean }> {
    // Normalize phone to E.164 format if provided
    const normalizedData = { ...data };
    if (normalizedData.phone !== undefined) {
      normalizedData.phone = this.normalizePhone(normalizedData.phone);
    }

    const customer = await StorefrontAuthRepository.updateProfile(customerId, normalizedData);
    return { customer, isProfileComplete: this.isProfileComplete(customer) };
  }

  /**
   * Check if all required profile fields are filled.
   */
  private isProfileComplete(customer: StorefrontCustomer): boolean {
    return !!(customer.firstName?.trim() && customer.lastName?.trim() && customer.phone?.trim());
  }

  /**
   * Normalize Israeli phone number to E.164 format (+972XXXXXXXXX).
   * Strips non-digit characters, handles leading 0 or 972 prefix.
   */
  private normalizePhone(phone: string): string {
    // Strip all non-digit characters
    let digits = phone.replace(/\D/g, '');

    // Remove international dialing prefix (00)
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }

    // Remove leading country code
    if (digits.startsWith('972')) {
      digits = digits.slice(3);
    }

    // Remove leading zero
    if (digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    // Validate: must be 9 digits starting with 5 or 7
    if (digits.length !== 9 || !/^[57]/.test(digits)) {
      throw new ValidationError('Invalid phone number. Must be an Israeli mobile number (05XXXXXXXX or 07XXXXXXXX)');
    }

    return `+972${digits}`;
  }
}
