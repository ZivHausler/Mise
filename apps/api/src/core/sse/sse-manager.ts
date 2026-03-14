import type { FastifyReply } from 'fastify';

interface SSEClient {
  reply: FastifyReply;
}

class SSEManager {
  /** Backoffice clients keyed by storeId */
  private clients = new Map<number, SSEClient[]>();
  /** Public storefront clients keyed by channel string (e.g. "order:123") */
  private channels = new Map<string, SSEClient[]>();

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
    const failed: SSEClient[] = [];

    for (const client of storeClients) {
      try {
        client.reply.raw.write(message);
      } catch {
        failed.push(client);
      }
    }

    if (failed.length > 0) {
      const remaining = storeClients.filter((c) => !failed.includes(c));
      if (remaining.length === 0) {
        this.clients.delete(key);
      } else {
        this.clients.set(key, remaining);
      }
    }
  }

  addChannelClient(channel: string, reply: FastifyReply): void {
    const list = this.channels.get(channel) ?? [];
    list.push({ reply });
    this.channels.set(channel, list);
  }

  removeChannelClient(channel: string, reply: FastifyReply): void {
    const list = this.channels.get(channel);
    if (!list) return;
    const filtered = list.filter((c) => c.reply !== reply);
    if (filtered.length === 0) {
      this.channels.delete(channel);
    } else {
      this.channels.set(channel, filtered);
    }
  }

  hasChannelClients(channel: string): boolean {
    const list = this.channels.get(channel);
    return !!list && list.length > 0;
  }

  hasChannelClientsWithPrefix(prefix: string): boolean {
    for (const [key, list] of this.channels) {
      if (key.startsWith(prefix) && list.length > 0) return true;
    }
    return false;
  }

  broadcastToChannel(channel: string, event: string, data: unknown): void {
    const list = this.channels.get(channel);
    if (!list) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const failed: SSEClient[] = [];

    for (const client of list) {
      try {
        client.reply.raw.write(message);
      } catch {
        failed.push(client);
      }
    }

    if (failed.length > 0) {
      const remaining = list.filter((c) => !failed.includes(c));
      if (remaining.length === 0) {
        this.channels.delete(channel);
      } else {
        this.channels.set(channel, remaining);
      }
    }
  }
}

export const sseManager = new SSEManager();
