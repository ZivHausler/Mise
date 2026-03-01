import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError, ValidationError } from '../../core/errors/app-error.js';
import { getPool } from '../../core/database/postgres.js';
import { StoreRole } from '../stores/store.types.js';
import { chatRequestSchema } from './ai-chat.schema.js';
import { streamChat, chat } from './ai-chat.service.js';
import { env } from '../../config/env.js';

function assertOwnerOrAdmin(request: FastifyRequest): void {
  const user = request.currentUser!;
  if (user.isAdmin) return;
  if (user.storeRole === StoreRole.OWNER) return;
  throw new ForbiddenError('AI Chat is available to store owners only');
}

async function getStoreName(storeId: number): Promise<string> {
  const pool = getPool();
  const result = await pool.query('SELECT name FROM stores WHERE id = $1', [storeId]);
  return (result.rows[0]?.['name'] as string) ?? 'My Bakery';
}

export class AiChatController {
  async stream(request: FastifyRequest, reply: FastifyReply) {
    assertOwnerOrAdmin(request);

    if (!env.GEMINI_API_KEY) {
      throw new ValidationError('AI Chat is not configured');
    }

    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const storeId = request.currentUser!.storeId!;
    const storeName = await getStoreName(storeId);

    await reply.hijack();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    reply.raw.write(':ok\n\n');

    try {
      for await (const event of streamChat(storeId, storeName, parsed.data)) {
        reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      }
    } catch (err) {
      request.log.error(err, 'AI chat stream error');
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: 'An error occurred while processing your request.' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  }

  async message(request: FastifyRequest, reply: FastifyReply) {
    assertOwnerOrAdmin(request);

    if (!env.GEMINI_API_KEY) {
      throw new ValidationError('AI Chat is not configured');
    }

    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const storeId = request.currentUser!.storeId!;
    const storeName = await getStoreName(storeId);

    const result = await chat(storeId, storeName, parsed.data);

    return reply.send({ success: true, data: result });
  }
}
