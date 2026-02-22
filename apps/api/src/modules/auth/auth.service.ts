import type { FastifyInstance } from 'fastify';
import type { LoginDTO, RegisterDTO, AuthResponse, AuthTokenPayload, UserPublic } from './auth.types.js';
import { RegisterUserUseCase } from './use-cases/registerUser.js';
import { LoginUserUseCase } from './use-cases/loginUser.js';
import { GetUserProfileUseCase } from './use-cases/getUserProfile.js';
import { GoogleAuthUseCase } from './use-cases/googleAuth.js';
import { MergeGoogleAccountUseCase } from './use-cases/mergeGoogleAccount.js';
import { MergeEmailToGoogleUseCase } from './use-cases/mergeEmailToGoogle.js';
import { GoogleRegisterUseCase } from './use-cases/googleRegister.js';
import type { User } from './auth.types.js';
import { PgStoreRepository } from '../stores/store.repository.js';
import { StoreRole, type StoreInvitation } from '../stores/store.types.js';
import { ForbiddenError } from '../../core/errors/app-error.js';
import { env } from '../../config/env.js';
import { blacklistToken } from '../../core/auth/token-blacklist.js';

export class AuthService {
  private registerUseCase: RegisterUserUseCase;
  private loginUseCase: LoginUserUseCase;
  private getUserProfileUseCase: GetUserProfileUseCase;
  private googleAuthUseCase: GoogleAuthUseCase;
  private mergeGoogleAccountUseCase: MergeGoogleAccountUseCase;
  private mergeEmailToGoogleUseCase: MergeEmailToGoogleUseCase;
  private googleRegisterUseCase: GoogleRegisterUseCase;

  constructor(
    private app: FastifyInstance,
  ) {
    this.registerUseCase = new RegisterUserUseCase();
    this.loginUseCase = new LoginUserUseCase();
    this.getUserProfileUseCase = new GetUserProfileUseCase();
    this.googleAuthUseCase = new GoogleAuthUseCase();
    this.mergeGoogleAccountUseCase = new MergeGoogleAccountUseCase();
    this.mergeEmailToGoogleUseCase = new MergeEmailToGoogleUseCase();
    this.googleRegisterUseCase = new GoogleRegisterUseCase();
  }

  async register(data: RegisterDTO, inviteToken?: string): Promise<AuthResponse> {
    const { invitation, token: validToken } = await this.validateInvitation(inviteToken, data.email);

    const user = await this.registerUseCase.execute(data);

    // Join-store invite: add user to store immediately
    if (invitation.storeId !== null) {
      await PgStoreRepository.addUserToStore(user.id, invitation.storeId, invitation.role);
      await PgStoreRepository.markInvitationUsed(validToken);
      const token = this.generateToken(user, invitation.storeId, invitation.role);
      const invStores = await PgStoreRepository.getUserStores(user.id);
      return { user: this.toPublic(user), token, hasStore: true, stores: this.formatStores(invStores) };
    }

    // Create-store invite: create user but don't mark invite used yet (marked when store is created)
    const token = this.generateToken(user);
    return {
      user: this.toPublic(user),
      token,
      hasStore: false,
      stores: [],
      pendingCreateStoreToken: validToken,
    };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await this.loginUseCase.execute(data);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: user.isAdmin || stores.length > 0, stores: this.formatStores(stores) };
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const user = await this.googleAuthUseCase.execute(idToken);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: user.isAdmin || stores.length > 0, stores: this.formatStores(stores) };
  }

  async googleRegister(idToken: string, inviteToken?: string): Promise<AuthResponse> {
    const { invitation, token: validToken } = await this.validateInvitation(inviteToken);

    const user = await this.googleRegisterUseCase.execute(idToken);

    // Validate after Google auth since the email comes from the token
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError('Email does not match the invitation');
    }

    // Join-store invite: add user to store immediately
    if (invitation.storeId !== null) {
      await PgStoreRepository.addUserToStore(user.id, invitation.storeId, invitation.role);
      await PgStoreRepository.markInvitationUsed(validToken);
      const token = this.generateToken(user, invitation.storeId, invitation.role);
      const invStores = await PgStoreRepository.getUserStores(user.id);
      return { user: this.toPublic(user), token, hasStore: true, stores: this.formatStores(invStores) };
    }

    // Create-store invite: create user but don't mark invite used yet
    const token = this.generateToken(user);
    return {
      user: this.toPublic(user),
      token,
      hasStore: false,
      stores: [],
      pendingCreateStoreToken: validToken,
    };
  }

  async mergeGoogleToEmail(idToken: string, password: string): Promise<AuthResponse> {
    const user = await this.mergeGoogleAccountUseCase.execute(idToken, password);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: user.isAdmin || stores.length > 0, stores: this.formatStores(stores) };
  }

  async mergeEmailToGoogle(idToken: string, newPassword: string): Promise<AuthResponse> {
    const user = await this.mergeEmailToGoogleUseCase.execute(idToken, newPassword);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: user.isAdmin || stores.length > 0, stores: this.formatStores(stores) };
  }

  async getProfile(userId: number): Promise<UserPublic & { stores: { storeId: number; storeName: string; role: number }[]; hasStore: boolean }> {
    const user = await this.getUserProfileUseCase.execute(userId);
    const stores = await PgStoreRepository.getUserStores(userId);
    return {
      ...this.toPublic(user),
      stores: stores.map((s) => ({ storeId: s.storeId, storeName: s.storeName, role: s.role })),
      hasStore: user.isAdmin || stores.length > 0,
    };
  }

  async logout(jti: string | undefined, expiresAt: number): Promise<void> {
    if (!jti) return;
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresAt - now;
    if (ttl > 0) {
      await blacklistToken(jti, ttl);
    }
  }

  async refreshToken(userId: number): Promise<AuthResponse> {
    const user = await this.getUserProfileUseCase.execute(userId);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: user.isAdmin || stores.length > 0, stores: this.formatStores(stores) };
  }

  private async generateTokenWithStoreInfo(user: User): Promise<string> {
    // For regular users, pick their first store
    const stores = await PgStoreRepository.getUserStores(user.id);
    if (stores.length > 0) {
      const role = user.isAdmin ? StoreRole.ADMIN : stores[0]!.role;
      return this.generateToken(user, stores[0]!.storeId, role);
    }

    // Admins may not belong to any store — pick the first store in the system
    if (user.isAdmin) {
      const allStores = await PgStoreRepository.getAllStores();
      if (allStores.length > 0) {
        return this.generateToken(user, allStores[0]!.id, StoreRole.ADMIN);
      }
    }

    return this.generateToken(user);
  }

  private generateToken(user: User, storeId?: number, storeRole?: StoreRole): string {
    const payload: AuthTokenPayload = { userId: user.id, email: user.email, jti: crypto.randomUUID() };
    if (user.isAdmin) {
      payload.isAdmin = true;
    }
    if (storeId) {
      payload.storeId = storeId;
      payload.storeRole = storeRole;
    }
    return this.app.jwt.sign(payload, { expiresIn: env.JWT_EXPIRES_IN });
  }

  private formatStores(stores: { storeId: number; storeName: string; role: number }[]) {
    return stores.map((s) => ({ storeId: s.storeId, storeName: s.storeName, role: s.role }));
  }

  private async validateInvitation(inviteToken: string | undefined, email?: string): Promise<{ invitation: StoreInvitation; token: string }> {
    if (!inviteToken) {
      throw new ForbiddenError('Registration requires an invitation');
    }

    const invitation = await PgStoreRepository.findInvitationByToken(inviteToken);
    if (!invitation) {
      throw new ForbiddenError('Invalid or expired invitation');
    }

    if (email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenError('Email does not match the invitation');
    }

    return { invitation, token: inviteToken };
  }

  private toPublic(user: User): UserPublic {
    return { id: user.id, email: user.email, name: user.name, phone: user.phone, language: user.language, isAdmin: user.isAdmin };
  }
}
