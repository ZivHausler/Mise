import { getPool } from '../../../core/database/postgres.js';

export interface RecipeCategory {
  id: number;
  storeId: number;
  name: string;
  nameEn: string | null;
  createdAt: Date;
}

const SELECT_COLS = 'id, store_id, name, name_en, created_at';

export class PgCategoriesRepository {
  static async findAll(storeId: number): Promise<RecipeCategory[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM recipe_categories WHERE store_id = $1 ORDER BY name`,
      [storeId],
    );
    return result.rows.map(this.mapRow);
  }

  static async findById(id: number, storeId: number): Promise<RecipeCategory | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SELECT_COLS} FROM recipe_categories WHERE id = $1 AND store_id = $2`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async create(storeId: number, name: string, nameEn?: string | null): Promise<RecipeCategory> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO recipe_categories (store_id, name, name_en) VALUES ($1, $2, $3) RETURNING ${SELECT_COLS}`,
      [storeId, name, nameEn || null],
    );
    return this.mapRow(result.rows[0]);
  }

  static async update(id: number, storeId: number, name: string, nameEn?: string | null): Promise<RecipeCategory> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE recipe_categories SET name = $1, name_en = $2 WHERE id = $3 AND store_id = $4 RETURNING ${SELECT_COLS}`,
      [name, nameEn || null, id, storeId],
    );
    return this.mapRow(result.rows[0]);
  }

  static async delete(id: number, storeId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM recipe_categories WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  private static mapRow(row: Record<string, unknown>): RecipeCategory {
    return {
      id: Number(row['id']),
      storeId: Number(row['store_id']),
      name: row['name'] as string,
      nameEn: (row['name_en'] as string) ?? null,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
