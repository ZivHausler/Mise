import type { FastifyInstance } from 'fastify';
import type { IAuthRepository } from './auth.repository.js';
import type { LoginDTO, RegisterDTO, AuthResponse, UserPublic } from './auth.types.js';
import { RegisterUserUseCase } from './use-cases/registerUser.js';
import { LoginUserUseCase } from './use-cases/loginUser.js';
import { GetUserProfileUseCase } from './use-cases/getUserProfile.js';
import type { User } from './auth.types.js';
import { env } from '../../config/env.js';

export class AuthService {
  private registerUseCase: RegisterUserUseCase;
  private loginUseCase: LoginUserUseCase;
  private getUserProfileUseCase: GetUserProfileUseCase;

  constructor(
    private authRepository: IAuthRepository,
    private app: FastifyInstance,
  ) {
    this.registerUseCase = new RegisterUserUseCase(authRepository);
    this.loginUseCase = new LoginUserUseCase(authRepository);
    this.getUserProfileUseCase = new GetUserProfileUseCase(authRepository);
  }

  async register(data: RegisterDTO): Promise<AuthResponse> {
    const user = await this.registerUseCase.execute(data);
    const token = this.generateToken(user);
    return { user: this.toPublic(user), token };
  }

  async login(data: LoginDTO): Promise<AuthResponse> {
    const user = await this.loginUseCase.execute(data);
    const token = this.generateToken(user);
    return { user: this.toPublic(user), token };
  }

  async getProfile(userId: string): Promise<UserPublic> {
    const user = await this.getUserProfileUseCase.execute(userId);
    return this.toPublic(user);
  }

  async refreshToken(userId: string): Promise<AuthResponse> {
    const user = await this.getUserProfileUseCase.execute(userId);
    const token = this.generateToken(user);
    return { user: this.toPublic(user), token };
  }

  private generateToken(user: User): string {
    return this.app.jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      { expiresIn: env.JWT_EXPIRES_IN },
    );
  }

  private toPublic(user: User): UserPublic {
    return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
  }
}
