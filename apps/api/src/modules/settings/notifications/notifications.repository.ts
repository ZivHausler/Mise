import type { NotificationPreference } from '../settings.types.js';
import { getPool } from '../../../core/database/postgres.js';

export type NotificationRecipientRow = NotificationPreference & { email: string; name: string; phone?: string };

export class PgNotifPrefsRepository {
  static async findAll(userId: string): Promise<NotificationPreference[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, user_id, event_type, channel_email, channel_push, channel_sms, created_at, updated_at FROM notification_preferences WHERE user_id = $1 ORDER BY event_type',
      [userId],
    );
    return result.rows.map(this.mapRow);
  }

  static async upsert(userId: string, prefs: { eventType: string; email: boolean; push: boolean; sms: boolean }[]): Promise<NotificationPreference[]> {
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

  static async findByEventType(eventType: string): Promise<NotificationRecipientRow[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT np.id, np.user_id, np.event_type, np.channel_email, np.channel_push, np.channel_sms,
              np.created_at, np.updated_at, u.email, u.name, u.phone
       FROM notification_preferences np
       JOIN users u ON u.id = np.user_id
       WHERE np.event_type = $1
         AND (np.channel_email = true OR np.channel_sms = true)`,
      [eventType],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      ...this.mapRow(row),
      email: row['email'] as string,
      name: row['name'] as string,
      phone: (row['phone'] as string) ?? undefined,
    }));
  }

  private static mapRow(row: Record<string, unknown>): NotificationPreference {
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
