import type { Unit, UnitCategory, CreateUnitDTO, UpdateUnitDTO } from '../settings.types.js';
import { getPool } from '../../../core/database/postgres.js';

export class PgUnitsRepository {
  static async findAllCategories(): Promise<UnitCategory[]> {
    const pool = getPool();
    const result = await pool.query('SELECT id, name, created_at FROM unit_categories ORDER BY name');
    return result.rows.map(this.mapCategoryRow);
  }

  static async findAll(storeId: number): Promise<Unit[]> {
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

  static async findById(id: number, storeId: number): Promise<Unit | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT u.id, u.store_id, u.category_id, uc.name as category_name, u.name, u.abbreviation, u.conversion_factor, u.is_default, u.created_at, u.updated_at
       FROM units u
       JOIN unit_categories uc ON uc.id = u.category_id
       WHERE u.id = $1 AND (u.store_id = $2 OR u.is_default = true)`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  static async create(storeId: number, data: CreateUnitDTO): Promise<Unit> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO units (store_id, category_id, name, abbreviation, conversion_factor, is_default)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, store_id, category_id, name, abbreviation, conversion_factor, is_default, created_at, updated_at`,
      [storeId, data.categoryId, data.name, data.abbreviation, data.conversionFactor],
    );
    // Re-fetch with category name
    return (await this.findById(Number(result.rows[0]['id']), storeId))!;
  }

  static async update(id: number, storeId: number, data: UpdateUnitDTO): Promise<Unit> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.abbreviation !== undefined) { fields.push(`abbreviation = $${idx++}`); values.push(data.abbreviation); }
    if (data.conversionFactor !== undefined) { fields.push(`conversion_factor = $${idx++}`); values.push(data.conversionFactor); }

    fields.push('updated_at = NOW()');
    values.push(id);
    const idIdx = idx++;
    values.push(storeId);

    await pool.query(
      `UPDATE units SET ${fields.join(', ')} WHERE id = $${idIdx} AND store_id = $${idx}`,
      values,
    );
    return (await this.findById(id, storeId))!;
  }

  static async delete(id: number, storeId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM units WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  private static mapRow(row: Record<string, unknown>): Unit {
    return {
      id: Number(row['id']),
      storeId: row['store_id'] != null ? Number(row['store_id']) : null,
      category: {
        id: Number(row['category_id']),
        name: (row['category_name'] as string) || '',
      },
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
      id: Number(row['id']),
      name: row['name'] as string,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}
