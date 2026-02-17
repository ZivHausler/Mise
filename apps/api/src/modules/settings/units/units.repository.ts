import type { Unit, UnitCategory, CreateUnitDTO, UpdateUnitDTO } from '../settings.types.js';
import { getPool } from '../../../core/database/postgres.js';

export class PgUnitsRepository {
  static async findAllCategories(): Promise<UnitCategory[]> {
    const pool = getPool();
    const result = await pool.query('SELECT id, name, created_at FROM unit_categories ORDER BY name');
    return result.rows.map(this.mapCategoryRow);
  }

  static async findAll(storeId: string): Promise<Unit[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT u.id, u.store_id, u.category_id, uc.name as category_name, u.name, u.abbreviation, u.conversion_factor, u.is_default, u.created_at, u.updated_at
       FROM units u
       JOIN unit_categories uc ON uc.id = u.category_id
       WHERE u.store_id IS NULL OR u.store_id = $1
       ORDER BY uc.name, u.conversion_factor`,
      [storeId],
    );
    return result.rows.map(this.mapRow);
  }

  static async findById(id: string): Promise<Unit | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT u.id, u.store_id, u.category_id, uc.name as category_name, u.name, u.abbreviation, u.conversion_factor, u.is_default, u.created_at, u.updated_at
       FROM units u
       JOIN unit_categories uc ON uc.id = u.category_id
       WHERE u.id = $1`,
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async create(storeId: string, data: CreateUnitDTO): Promise<Unit> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO units (store_id, category_id, name, abbreviation, conversion_factor, is_default)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, store_id, category_id, name, abbreviation, conversion_factor, is_default, created_at, updated_at`,
      [storeId, data.categoryId, data.name, data.abbreviation, data.conversionFactor],
    );
    // Re-fetch with category name
    return (await this.findById(result.rows[0]['id'] as string))!;
  }

  static async update(id: string, data: UpdateUnitDTO): Promise<Unit> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.abbreviation !== undefined) { fields.push(`abbreviation = $${idx++}`); values.push(data.abbreviation); }
    if (data.conversionFactor !== undefined) { fields.push(`conversion_factor = $${idx++}`); values.push(data.conversionFactor); }

    fields.push('updated_at = NOW()');
    values.push(id);

    await pool.query(
      `UPDATE units SET ${fields.join(', ')} WHERE id = $${idx}`,
      values,
    );
    return (await this.findById(id))!;
  }

  static async delete(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM units WHERE id = $1', [id]);
  }

  private static mapRow(row: Record<string, unknown>): Unit {
    return {
      id: row['id'] as string,
      storeId: (row['store_id'] as string) || null,
      categoryId: row['category_id'] as string,
      categoryName: (row['category_name'] as string) || undefined,
      name: row['name'] as string,
      abbreviation: row['abbreviation'] as string,
      conversionFactor: Number(row['conversion_factor']),
      isDefault: row['is_default'] as boolean,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  private static mapCategoryRow(row: Record<string, unknown>): UnitCategory {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
