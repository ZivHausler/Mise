import type {
  Ingredient,
  CreateIngredientDTO,
  UpdateIngredientDTO,
  InventoryLog,
  AdjustStockDTO,
} from './inventory.types.js';

export interface IInventoryRepository {
  findById(id: string): Promise<Ingredient | null>;
  findAll(search?: string): Promise<Ingredient[]>;
  findLowStock(): Promise<Ingredient[]>;
  create(data: CreateIngredientDTO): Promise<Ingredient>;
  update(id: string, data: UpdateIngredientDTO): Promise<Ingredient>;
  adjustStock(data: AdjustStockDTO): Promise<Ingredient>;
  getLog(ingredientId: string): Promise<InventoryLog[]>;
  delete(id: string): Promise<void>;
}

import { getPool } from '../../core/database/postgres.js';

export class PgInventoryRepository implements IInventoryRepository {
  async findById(id: string): Promise<Ingredient | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE id = $1',
      [id],
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(search?: string): Promise<Ingredient[]> {
    const pool = getPool();
    let query = 'SELECT * FROM ingredients';
    const params: unknown[] = [];
    if (search) {
      // Escape SQL LIKE special characters to prevent wildcard injection
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      query += ` WHERE name ILIKE $1 ESCAPE '\\'`;
      params.push(`%${escaped}%`);
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findLowStock(): Promise<Ingredient[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE quantity <= low_stock_threshold ORDER BY quantity ASC',
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async create(data: CreateIngredientDTO): Promise<Ingredient> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO ingredients (id, name, unit, quantity, cost_per_unit, low_stock_threshold, supplier, notes, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [data.name, data.unit, data.quantity, data.costPerUnit, data.lowStockThreshold, data.supplier ?? null, data.notes ?? null],
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, data: UpdateIngredientDTO): Promise<Ingredient> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.unit !== undefined) { fields.push(`unit = $${idx++}`); values.push(data.unit); }
    if (data.quantity !== undefined) { fields.push(`quantity = $${idx++}`); values.push(data.quantity); }
    if (data.costPerUnit !== undefined) { fields.push(`cost_per_unit = $${idx++}`); values.push(data.costPerUnit); }
    if (data.lowStockThreshold !== undefined) { fields.push(`low_stock_threshold = $${idx++}`); values.push(data.lowStockThreshold); }
    if (data.supplier !== undefined) { fields.push(`supplier = $${idx++}`); values.push(data.supplier); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE ingredients SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return this.mapRow(result.rows[0]);
  }

  async adjustStock(data: AdjustStockDTO): Promise<Ingredient> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let quantityChange: number;
      switch (data.type) {
        case 'addition':
          quantityChange = data.quantity;
          break;
        case 'usage':
          quantityChange = -data.quantity;
          break;
        case 'adjustment':
          quantityChange = data.quantity;
          break;
      }

      const result = await client.query(
        `UPDATE ingredients SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [quantityChange, data.ingredientId],
      );

      await client.query(
        `INSERT INTO inventory_log (id, ingredient_id, type, quantity, reason, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
        [data.ingredientId, data.type, data.quantity, data.reason ?? null],
      );

      await client.query('COMMIT');
      return this.mapRow(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getLog(ingredientId: string): Promise<InventoryLog[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM inventory_log WHERE ingredient_id = $1 ORDER BY created_at DESC',
      [ingredientId],
    );
    return result.rows.map((r: Record<string, unknown>) => ({
      id: r['id'] as string,
      ingredientId: r['ingredient_id'] as string,
      type: r['type'] as InventoryLog['type'],
      quantity: Number(r['quantity']),
      reason: r['reason'] as string | undefined,
      createdAt: new Date(r['created_at'] as string),
    }));
  }

  async delete(id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM ingredients WHERE id = $1', [id]);
  }

  private mapRow(row: Record<string, unknown>): Ingredient {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      unit: row['unit'] as string,
      quantity: Number(row['quantity']),
      costPerUnit: Number(row['cost_per_unit']),
      lowStockThreshold: Number(row['low_stock_threshold']),
      supplier: row['supplier'] as string | undefined,
      notes: row['notes'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
