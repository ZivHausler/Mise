import { getPool } from '../../../core/database/postgres.js';

export interface WhatsAppConfigRow {
  id: number;
  storeId: number;
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class WhatsAppRepository {
  static async findByStoreId(storeId: number): Promise<WhatsAppConfigRow | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, store_id, phone_number_id, access_token, business_account_id, created_at, updated_at FROM whatsapp_config WHERE store_id = $1',
      [storeId],
    );
    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  static async upsert(
    storeId: number,
    phoneNumberId: string,
    accessToken: string,
    businessAccountId: string,
  ): Promise<WhatsAppConfigRow> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO whatsapp_config (store_id, phone_number_id, access_token, business_account_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (store_id)
       DO UPDATE SET phone_number_id = $2, access_token = $3, business_account_id = $4, updated_at = NOW()
       RETURNING id, store_id, phone_number_id, access_token, business_account_id, created_at, updated_at`,
      [storeId, phoneNumberId, accessToken, businessAccountId],
    );
    return this.mapRow(result.rows[0]!);
  }

  static async delete(storeId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM whatsapp_config WHERE store_id = $1', [storeId]);
  }

  private static mapRow(row: Record<string, unknown>): WhatsAppConfigRow {
    return {
      id: Number(row['id']),
      storeId: Number(row['store_id']),
      phoneNumberId: row['phone_number_id'] as string,
      accessToken: row['access_token'] as string,
      businessAccountId: row['business_account_id'] as string,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
