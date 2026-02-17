import type { Group, CreateGroupDTO, UpdateGroupDTO } from '../settings.types.js';
import { getPool } from '../../../core/database/postgres.js';

const SELECT_COLS = 'id, store_id, name, color, icon, is_default, created_at, updated_at';

export class PgGroupsRepository {
  static async findAll(storeId: string): Promise<Group[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM groups WHERE store_id = $1 OR is_default = true ORDER BY is_default DESC, name`,
      [storeId],
    );
    return result.rows.map(this.mapRow);
  }

  static async findById(id: string): Promise<Group | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM groups WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async create(storeId: string, data: CreateGroupDTO): Promise<Group> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO groups (store_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING ${SELECT_COLS}`,
      [storeId, data.name, data.color || null],
    );
    return this.mapRow(result.rows[0]);
  }

  static async update(id: string, data: UpdateGroupDTO): Promise<Group> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.color !== undefined) { fields.push(`color = $${idx++}`); values.push(data.color); }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await pool.query(
      `UPDATE groups SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING ${SELECT_COLS}`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  static async delete(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);
  }

  private static mapRow(row: Record<string, unknown>): Group {
    return {
      id: row['id'] as string,
      storeId: (row['store_id'] as string) || null,
      name: row['name'] as string,
      color: (row['color'] as string) || null,
      icon: (row['icon'] as string) || null,
      isDefault: row['is_default'] as boolean,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
