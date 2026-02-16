import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // PostgreSQL
  DATABASE_URL: z.string().default('postgresql://mise:mise@localhost:5432/mise'),

  // MongoDB
  MONGODB_URI: z.string().default('mongodb://localhost:27017/mise'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // RabbitMQ
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default(''),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  // Enforce strong JWT secret in production
  if (parsed.data.NODE_ENV === 'production') {
    if (
      parsed.data.JWT_SECRET === 'dev-secret-change-in-production' ||
      parsed.data.JWT_SECRET === 'change-this-to-a-secure-secret-in-production' ||
      parsed.data.JWT_SECRET.length < 64
    ) {
      console.error('FATAL: JWT_SECRET must be a strong, unique value (>= 64 chars) in production');
      process.exit(1);
    }
  }

  return parsed.data;
}

export const env = loadEnv();
