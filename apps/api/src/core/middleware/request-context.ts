import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function requestContextPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    request.log = request.log.child({
      requestId: request.id,
    });
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    request.log.info(
      {
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'request completed',
    );
  });
}
