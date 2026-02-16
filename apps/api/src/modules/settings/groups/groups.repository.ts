import type { Group, CreateGroupDTO, UpdateGroupDTO } from '../settings.types.js';
import { getPool } from '../../../core/database/postgres.js';

export interface IGroupsRepository {
  findAll(userId: string): Promise<Group[]>;
  findById(id: string): Promise<Group | null>;
  create(userId: string, data: CreateGroupDTO): Promise<Group>;
  update(id: string, data: UpdateGroupDTO): Promise<Group>;
  delete(id: string): Promise<void>;
}

const SELECT_COLS = 'id, user_id, name, color, icon, is_default, created_at, updated_at';

export class PgGroupsRepository implements IGroupsRepository {
  async findAll(userId: string): Promise<Group[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM groups WHERE user_id = $1 OR is_default = true ORDER BY is_default DESC, name`,
      [userId],
    );
    return result.rows.map(this.mapRow);
  }

  async findById(id: string): Promise<Group | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM groups WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async create(userId: string, data: CreateGroupDTO): Promise<Group> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO groups (user_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING ${SELECT_COLS}`,
      [userId, data.name, data.color || null],
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: UpdateGroupDTO): Promise<Group> {
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

  async delete(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM groups WHERE id = $1', [id]);
  }

  private mapRow(row: Record<string, unknown>): Group {
    return {
      id: row['id'] as string,
      userId: (row['user_id'] as string) || null,
      name: row['name'] as string,
      color: (row['color'] as string) || null,
      icon: (row['icon'] as string) || null,
      isDefault: row['is_default'] as boolean,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
