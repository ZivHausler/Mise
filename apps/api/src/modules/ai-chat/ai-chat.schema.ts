import { z } from 'zod';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(chatMessageSchema).max(20).default([]),
  language: z.enum(['en', 'he']).default('he'),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
