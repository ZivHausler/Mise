import type { FastifyInstance } from 'fastify';
import type { LoginDTO, RegisterDTO, AuthResponse, AuthTokenPayload, UserPublic } from './auth.types.js';
import { RegisterUserUseCase } from './use-cases/registerUser.js';
import { LoginUserUseCase } from './use-cases/loginUser.js';
import { GetUserProfileUseCase } from './use-cases/getUserProfile.js';
import { GoogleAuthUseCase } from './use-cases/googleAuth.js';
import { MergeGoogleAccountUseCase } from './use-cases/mergeGoogleAccount.js';
import { MergeEmailToGoogleUseCase } from './use-cases/mergeEmailToGoogle.js';
import type { User } from './auth.types.js';
import { PgStoreRepository } from '../stores/store.repository.js';
import { StoreRole } from '../stores/store.types.js';
import { env } from '../../config/env.js';

export class AuthService {
  private registerUseCase: RegisterUserUseCase;
  private loginUseCase: LoginUserUseCase;
  private getUserProfileUseCase: GetUserProfileUseCase;
  private googleAuthUseCase: GoogleAuthUseCase;
  private mergeGoogleAccountUseCase: MergeGoogleAccountUseCase;
  private mergeEmailToGoogleUseCase: MergeEmailToGoogleUseCase;

  constructor(
    private app: FastifyInstance,
  ) {
    this.registerUseCase = new RegisterUserUseCase();
    this.loginUseCase = new LoginUserUseCase();
    this.getUserProfileUseCase = new GetUserProfileUseCase();
    this.googleAuthUseCase = new GoogleAuthUseCase();
    this.mergeGoogleAccountUseCase = new MergeGoogleAccountUseCase();
    this.mergeEmailToGoogleUseCase = new MergeEmailToGoogleUseCase();
  }

  async register(data: RegisterDTO, inviteToken?: string): Promise<AuthResponse> {
    const user = await this.registerUseCase.execute(data);

    // Handle invite token
    if (inviteToken) {
      const invitation = await PgStoreRepository.findInvitationByToken(inviteToken);
      if (invitation) {
        await PgStoreRepository.addUserToStore(user.id, invitation.storeId, invitation.role);
        await PgStoreRepository.markInvitationUsed(inviteToken);
        const token = this.generateToken(user, invitation.storeId, invitation.role);
        const invStores = await PgStoreRepository.getUserStores(user.id);
        return { user: this.toPublic(user), token, hasStore: true, stores: this.formatStores(invStores) };
      }
    }

    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: stores.length > 0, stores: this.formatStores(stores) };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await this.loginUseCase.execute(data);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: stores.length > 0, stores: this.formatStores(stores) };
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const user = await this.googleAuthUseCase.execute(idToken);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: stores.length > 0, stores: this.formatStores(stores) };
  }

  async mergeGoogleToEmail(idToken: string, password: string): Promise<AuthResponse> {
    const user = await this.mergeGoogleAccountUseCase.execute(idToken, password);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: stores.length > 0, stores: this.formatStores(stores) };
  }

  async mergeEmailToGoogle(idToken: string, newPassword: string): Promise<AuthResponse> {
    const user = await this.mergeEmailToGoogleUseCase.execute(idToken, newPassword);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: stores.length > 0, stores: this.formatStores(stores) };
  }

  async getProfile(userId: string): Promise<UserPublic & { stores: { storeId: string; storeName: string; role: number }[]; hasStore: boolean }> {
    const user = await this.getUserProfileUseCase.execute(userId);
    const stores = await PgStoreRepository.getUserStores(userId);
    return {
      ...this.toPublic(user),
      stores: stores.map((s) => ({ storeId: s.storeId, storeName: s.storeName, role: s.role })),
      hasStore: stores.length > 0,
    };
  }

  async refreshToken(userId: string): Promise<AuthResponse> {
    const user = await this.getUserProfileUseCase.execute(userId);
    const token = await this.generateTokenWithStoreInfo(user);
    const stores = await PgStoreRepository.getUserStores(user.id);
    return { user: this.toPublic(user), token, hasStore: stores.length > 0, stores: this.formatStores(stores) };
  }

  private async generateTokenWithStoreInfo(user: User): Promise<string> {
    const stores = await PgStoreRepository.getUserStores(user.id);
    if (stores.length > 0) {
      return this.generateToken(user, stores[0]!.storeId, stores[0]!.role);
    }
    return this.generateToken(user);
  }

  private generateToken(user: User, storeId?: string, storeRole?: StoreRole): string {
    const payload: AuthTokenPayload = { userId: user.id, email: user.email };
    if (storeId) {
      payload.storeId = storeId;
      payload.storeRole = storeRole;
    }
    return this.app.jwt.sign(payload, { expiresIn: env.JWT_EXPIRES_IN });
  }

  private formatStores(stores: { storeId: string; storeName: string; role: number }[]) {
    return stores.map((s) => ({ storeId: s.storeId, storeName: s.storeName, role: s.role }));
  }

  private toPublic(user: User): UserPublic {
    return { id: user.id, email: user.email, name: user.name, phone: user.phone };
  }
}
