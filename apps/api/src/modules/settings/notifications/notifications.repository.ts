import type { NotificationPreference } from '../settings.types.js';
import { getPool } from '../../../core/database/postgres.js';

export interface INotifPrefsRepository {
  findAll(userId: string): Promise<NotificationPreference[]>;
  upsert(userId: string, prefs: { eventType: string; email: boolean; push: boolean; sms: boolean }[]): Promise<NotificationPreference[]>;
}

export class PgNotifPrefsRepository implements INotifPrefsRepository {
  async findAll(userId: string): Promise<NotificationPreference[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, user_id, event_type, channel_email, channel_push, channel_sms, created_at, updated_at FROM notification_preferences WHERE user_id = $1 ORDER BY event_type',
      [userId],
    );
    return result.rows.map(this.mapRow);
  }

  async upsert(userId: string, prefs: { eventType: string; email: boolean; push: boolean; sms: boolean }[]): Promise<NotificationPreference[]> {
    const pool = getPool();

    for (const pref of prefs) {
      await pool.query(
        `INSERT INTO notification_preferences (user_id, event_type, channel_email, channel_push, channel_sms)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, event_type)
         DO UPDATE SET channel_email = $3, channel_push = $4, channel_sms = $5, updated_at = NOW()`,
        [userId, pref.eventType, pref.email, pref.push, pref.sms],
      );
    }

    return this.findAll(userId);
  }

  private mapRow(row: Record<string, unknown>): NotificationPreference {
    return {
      id: row['id'] as string,
      userId: row['user_id'] as string,
      eventType: row['event_type'] as NotificationPreference['eventType'],
      channelEmail: row['channel_email'] as boolean,
      channelPush: row['channel_push'] as boolean,
      channelSms: row['channel_sms'] as boolean,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
