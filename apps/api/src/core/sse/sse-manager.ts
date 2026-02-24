import type { FastifyReply } from 'fastify';

interface SSEClient {
  reply: FastifyReply;
}

class SSEManager {
  private clients = new Map<number, SSEClient[]>();

  addClient(storeId: number, reply: FastifyReply): void {
    const key = Number(storeId);
    const storeClients = this.clients.get(key) ?? [];
    storeClients.push({ reply });
    this.clients.set(key, storeClients);
  }

  removeClient(storeId: number, reply: FastifyReply): void {
    const key = Number(storeId);
    const storeClients = this.clients.get(key);
    if (!storeClients) return;
    const filtered = storeClients.filter((c) => c.reply !== reply);
    if (filtered.length === 0) {
      this.clients.delete(key);
    } else {
      this.clients.set(key, filtered);
    }
  }

  broadcast(storeId: number, event: string, data: unknown): void {
    const key = Number(storeId);
    const storeClients = this.clients.get(key);
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
