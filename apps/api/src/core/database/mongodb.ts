import { MongoClient as NativeMongoClient, Db } from 'mongodb';
import { env } from '../../config/env.js';

export const mongoConfig = {
  uri: env.MONGODB_URI,
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
};

export interface MongoClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  getDb(): Db;
}

let client: NativeMongoClient | null = null;
let db: Db | null = null;

export const mongoClient: MongoClient = {
  async connect() {
    client = new NativeMongoClient(mongoConfig.uri, mongoConfig.options);
    await client.connect();
    db = client.db();
  },
  async disconnect() {
    if (client) {
      await client.close();
      client = null;
      db = null;
    }
  },
  async isHealthy() {
    try {
      if (!client || !db) return false;
      await db.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  },
  getDb() {
    if (!db) throw new Error('MongoDB not connected. Call connect() first.');
    return db;
  },
};
