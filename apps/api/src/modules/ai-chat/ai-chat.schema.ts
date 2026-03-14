import { z } from 'zod';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(chatMessageSchema).max(20, { message: 'Conversation limit reached. Please start a new conversation.' }).default([]),
  language: z.enum(['en', 'he']).default('he'),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

export const translateRequestSchema = z.object({
  text: z.string().trim().min(1, 'Text is required').max(1000, 'Text too long'),
  fieldType: z.enum(['name', 'description']),
});

export type TranslateRequestInput = z.infer<typeof translateRequestSchema>;
