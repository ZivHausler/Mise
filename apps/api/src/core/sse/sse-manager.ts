import type { FastifyReply } from 'fastify';

interface SSEClient {
  reply: FastifyReply;
}

class SSEManager {
  private clients = new Map<string, SSEClient[]>();

  addClient(storeId: string, reply: FastifyReply): void {
    const storeClients = this.clients.get(storeId) ?? [];
    storeClients.push({ reply });
    this.clients.set(storeId, storeClients);
  }

  removeClient(storeId: string, reply: FastifyReply): void {
    const storeClients = this.clients.get(storeId);
    if (!storeClients) return;
    const filtered = storeClients.filter((c) => c.reply !== reply);
    if (filtered.length === 0) {
      this.clients.delete(storeId);
    } else {
      this.clients.set(storeId, filtered);
    }
  }

  broadcast(storeId: string, event: string, data: unknown): void {
    const storeClients = this.clients.get(storeId);
    if (!storeClients) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const client of storeClients) {
      try {
        client.reply.raw.write(message);
      } catch {
        // client disconnected, will be cleaned up
      }
    }
  }
}

export const sseManager = new SSEManager();
