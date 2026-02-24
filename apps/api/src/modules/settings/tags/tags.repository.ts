import { getPool } from '../../../core/database/postgres.js';

export interface RecipeTag {
  id: number;
  storeId: number;
  name: string;
  createdAt: Date;
}

const SELECT_COLS = 'id, store_id, name, created_at';

export class PgTagsRepository {
  static async findAll(storeId: number): Promise<RecipeTag[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM recipe_tags WHERE store_id = $1 ORDER BY name`,
      [storeId],
    );
    return result.rows.map(this.mapRow);
  }

  static async findById(id: number, storeId: number): Promise<RecipeTag | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM recipe_tags WHERE id = $1 AND store_id = $2`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async create(storeId: number, name: string): Promise<RecipeTag> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO recipe_tags (store_id, name) VALUES ($1, $2) RETURNING ${SELECT_COLS}`,
      [storeId, name],
    );
    return this.mapRow(result.rows[0]);
  }

  static async update(id: number, storeId: number, name: string): Promise<RecipeTag> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE recipe_tags SET name = $1 WHERE id = $2 AND store_id = $3 RETURNING ${SELECT_COLS}`,
      [name, id, storeId],
    );
    return this.mapRow(result.rows[0]);
  }

  static async delete(id: number, storeId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM recipe_tags WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  private static mapRow(row: Record<string, unknown>): RecipeTag {
    return {
      id: Number(row['id']),
      storeId: Number(row['store_id']),
      name: row['name'] as string,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
