import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('127.0.0.1'),

  // PostgreSQL
  DATABASE_URL: z.string().default('postgresql://mise:mise@localhost:5432/mise'),

  // MongoDB
  MONGODB_URI: z.string().default('mongodb://localhost:27017/mise'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // RabbitMQ
  RABBITMQ_URL: z.string().default('amqp://localhost:5672'),
  RABBITMQ_RETRY_TTL: z.coerce.number().default(5000),
  RABBITMQ_MAX_RETRIES: z.coerce.number().default(3),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default(''),

  // Frontend URL (for invite links)
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Admin
  ADMIN_SECRET: z.string().min(16).default('dev-admin-secret-change-in-production'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(1000),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AUTH_RATE_LIMIT_WINDOW: z.string().default('15 minutes'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Google Cloud Storage
  GCS_BUCKET_NAME: z.string().default(''),
  GCS_PROJECT_ID: z.string().default(''),

  // Resend (email)
  RESEND_API_KEY: z.string().default(''),

  // WhatsApp Business Cloud API
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),

  // Meta (WhatsApp Embedded Signup)
  META_APP_ID: z.string().default(''),
  META_APP_SECRET: z.string().default(''),

  // Gemini AI
  GEMINI_API_KEY: z.string().default(''),

  // Feature flags — comma-separated store IDs that have the feature enabled, or '*' for all stores
  FEATURE_PRODUCTION: z.string().default(''),
  FEATURE_WHATSAPP: z.string().default(''),
  FEATURE_SMS: z.string().default(''),
  FEATURE_AI_CHAT: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    process.stderr.write(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}\n`);
    process.exit(1);
  }

  // Enforce production-critical env vars
  if (parsed.data.NODE_ENV === 'production') {
    if (
      parsed.data.JWT_SECRET === 'dev-secret-change-in-production' ||
      parsed.data.JWT_SECRET === 'change-this-to-a-secure-secret-in-production' ||
      parsed.data.JWT_SECRET.length < 64
    ) {
      process.stderr.write('FATAL: JWT_SECRET must be a strong, unique value (>= 64 chars) in production\n');
      process.exit(1);
    }

    if (
      parsed.data.FRONTEND_URL === 'http://localhost:5173' ||
      parsed.data.FRONTEND_URL.includes('localhost')
    ) {
      process.stderr.write('FATAL: FRONTEND_URL must be set to a real URL in production (not localhost)\n');
      process.exit(1);
    }

    if (
      parsed.data.ADMIN_SECRET === 'dev-admin-secret-change-in-production' ||
      parsed.data.ADMIN_SECRET.length < 32
    ) {
      process.stderr.write('FATAL: ADMIN_SECRET must be a strong, unique value (>= 32 chars) in production\n');
      process.exit(1);
    }

    if (parsed.data.REDIS_URL === 'redis://localhost:6379') {
      process.stderr.write('FATAL: REDIS_URL must not be localhost in production\n');
      process.exit(1);
    }
  }

  return parsed.data;
}

export const env = loadEnv();
