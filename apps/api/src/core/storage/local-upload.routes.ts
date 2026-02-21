import type { FastifyInstance, FastifyRequest } from 'fastify';
import { promises as fs } from 'fs';
import { join } from 'path';
import { isLocalStorage, handleLocalUpload, LOCAL_UPLOAD_DIR } from './gcs.js';

export default async function localUploadRoutes(app: FastifyInstance) {
  if (!isLocalStorage()) return;

  const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
  for (const ct of ['image/jpeg', 'image/png', 'image/webp']) {
    app.addContentTypeParser(
      ct,
      { parseAs: 'buffer', bodyLimit: MAX_IMAGE_SIZE },
      (_req: FastifyRequest, body: Buffer, done: (err: Error | null, body?: Buffer) => void) => {
        done(null, body);
      },
    );
  }

  app.get('/uploads/*', async (request, reply) => {
    const wildcard = (request.params as Record<string, string>)['*'];
    const filePath = join(LOCAL_UPLOAD_DIR, wildcard);
    try {
      const data = await fs.readFile(filePath);
      const ext = filePath.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      reply.type(mimeMap[ext ?? ''] ?? 'application/octet-stream');
      return reply.send(data);
    } catch {
      return reply.status(404).send({ error: 'Not found' });
    }
  });

  app.put('/uploads/put/*', async (request, reply) => {
    const wildcard = (request.params as Record<string, string>)['*'];
    const body = request.body;
    if (!Buffer.isBuffer(body)) {
      return reply.status(400).send({ error: 'Expected binary body' });
    }
    await handleLocalUpload(wildcard, body);
    return reply.status(200).send({ ok: true });
  });
}
