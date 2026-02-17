import { InventoryLogType, INVENTORY_LOG_TYPE_DB, INVENTORY_LOG_TYPE_FROM_DB } from '@mise/shared';
import type {
  Ingredient,
  CreateIngredientDTO,
  UpdateIngredientDTO,
  InventoryLog,
  AdjustStockDTO,
  PaginatedResult,
} from './inventory.types.js';
import { getPool } from '../../core/database/postgres.js';

export class PgInventoryRepository {
  private static async attachGroups(ingredients: Ingredient[]): Promise<Ingredient[]> {
    if (ingredients.length === 0) return ingredients;
    const pool = getPool();
    const ids = ingredients.map((i) => i.id);
    const result = await pool.query(
      `SELECT ig.ingredient_id, g.id, g.name, g.color, g.icon, g.is_default
       FROM ingredient_groups ig
       JOIN groups g ON g.id = ig.group_id
       WHERE ig.ingredient_id = ANY($1)
       ORDER BY g.name`,
      [ids],
    );
    const groupMap = new Map<string, { id: string; name: string; color: string | null; icon: string | null; isDefault: boolean }[]>();
    for (const row of result.rows as Record<string, unknown>[]) {
      const iid = row['ingredient_id'] as string;
      if (!groupMap.has(iid)) groupMap.set(iid, []);
      groupMap.get(iid)!.push({ id: row['id'] as string, name: row['name'] as string, color: (row['color'] as string) || null, icon: (row['icon'] as string) || null, isDefault: row['is_default'] as boolean });
    }
    for (const ingredient of ingredients) {
      ingredient.groups = groupMap.get(ingredient.id) ?? [];
    }
    return ingredients;
  }

  private static async syncGroups(ingredientId: string, groupIds: string[]): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM ingredient_groups WHERE ingredient_id = $1', [ingredientId]);
    if (groupIds.length > 0) {
      const values = groupIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(`INSERT INTO ingredient_groups (ingredient_id, group_id) VALUES ${values}`, [ingredientId, ...groupIds]);
    }
  }

  static async findById(storeId: string, id: string): Promise<Ingredient | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM ingredients WHERE id = $1 AND store_id = $2', [id, storeId]);
    if (!result.rows[0]) return null;
    const ingredients = await this.attachGroups([this.mapRow(result.rows[0])]);
    return ingredients[0] ?? null;
  }

  static async findAll(storeId: string, search?: string): Promise<Ingredient[]> {
    const pool = getPool();
    let query = 'SELECT * FROM ingredients WHERE store_id = $1';
    const params: unknown[] = [storeId];
    if (search) {
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      query += ` AND name ILIKE $2 ESCAPE '\\'`;
      params.push(`%${escaped}%`);
    }
    query += ' ORDER BY name ASC';
    const result = await pool.query(query, params);
    const ingredients = result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    return this.attachGroups(ingredients);
  }

  static async findAllPaginated(storeId: string, page: number, limit: number, search?: string, groupIds?: string[]): Promise<PaginatedResult<Ingredient>> {
    const pool = getPool();
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    conditions.push(`store_id = $${idx}`);
    params.push(storeId);
    idx++;

    if (search) {
      const escaped = search.replace(/[%_\\]/g, '\\$&');
      conditions.push(`name ILIKE $${idx} ESCAPE '\\'`);
      params.push(`%${escaped}%`);
      idx++;
    }
    if (groupIds?.length) {
      conditions.push(`id IN (SELECT ingredient_id FROM ingredient_groups WHERE group_id = ANY($${idx}))`);
      params.push(groupIds);
      idx++;
    }

    const whereClause = ` WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(`SELECT COUNT(*) FROM ingredients${whereClause}`, params);
    const total = parseInt(countResult.rows[0]['count'] as string, 10);

    const dataParams = [...params, limit, offset];
    const dataResult = await pool.query(
      `SELECT * FROM ingredients${whereClause} ORDER BY name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams,
    );

    const ingredients = dataResult.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    const items = await this.attachGroups(ingredients);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async findLowStock(storeId: string): Promise<Ingredient[]> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM ingredients WHERE store_id = $1 AND quantity <= low_stock_threshold ORDER BY quantity ASC',
      [storeId],
    );
    const ingredients = result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    return this.attachGroups(ingredients);
  }

  static async create(storeId: string, data: CreateIngredientDTO): Promise<Ingredient> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO ingredients (id, store_id, name, unit, quantity, cost_per_unit, package_size, low_stock_threshold, supplier, notes, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [storeId, data.name, data.unit, data.quantity, data.costPerUnit, data.packageSize ?? null, data.lowStockThreshold, data.supplier ?? null, data.notes ?? null],
    );
    const id = result.rows[0]['id'] as string;
    if (data.groupIds?.length) await this.syncGroups(id, data.groupIds);
    return (await this.findById(storeId, id))!;
  }

  static async update(storeId: string, id: string, data: UpdateIngredientDTO): Promise<Ingredient> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.unit !== undefined) { fields.push(`unit = $${idx++}`); values.push(data.unit); }
    if (data.quantity !== undefined) { fields.push(`quantity = $${idx++}`); values.push(data.quantity); }
    if (data.costPerUnit !== undefined) { fields.push(`cost_per_unit = $${idx++}`); values.push(data.costPerUnit); }
    if (data.packageSize !== undefined) { fields.push(`package_size = $${idx++}`); values.push(data.packageSize); }
    if (data.lowStockThreshold !== undefined) { fields.push(`low_stock_threshold = $${idx++}`); values.push(data.lowStockThreshold); }
    if (data.supplier !== undefined) { fields.push(`supplier = $${idx++}`); values.push(data.supplier); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    const idIdx = idx;
    idx++;
    values.push(storeId);

    await pool.query(
      `UPDATE ingredients SET ${fields.join(', ')} WHERE id = $${idIdx} AND store_id = $${idx}`,
      values,
    );
    if (data.groupIds !== undefined) await this.syncGroups(id, data.groupIds);
    return (await this.findById(storeId, id))!;
  }

  static async adjustStock(storeId: string, data: AdjustStockDTO): Promise<Ingredient> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify the ingredient belongs to this store
      const verify = await client.query('SELECT id FROM ingredients WHERE id = $1 AND store_id = $2', [data.ingredientId, storeId]);
      if (!verify.rows[0]) {
        throw new Error('Ingredient not found');
      }

      let quantityChange: number;
      switch (data.type) {
        case InventoryLogType.ADDITION:
          quantityChange = data.quantity;
          break;
        case InventoryLogType.USAGE:
          quantityChange = -data.quantity;
          break;
        case InventoryLogType.ADJUSTMENT:
          quantityChange = data.quantity;
          break;
      }

      const result = await client.query(
        `UPDATE ingredients SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 AND store_id = $3 RETURNING *`,
        [quantityChange, data.ingredientId, storeId],
      );

      await client.query(
        `INSERT INTO inventory_log (id, ingredient_id, type, quantity, reason, price_paid, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
        [data.ingredientId, INVENTORY_LOG_TYPE_DB[data.type], data.quantity, data.reason ?? null, data.pricePaid ?? null],
      );

      // Recalculate average cost per unit from all additions with a price
      if (data.type === InventoryLogType.ADDITION && data.pricePaid != null) {
        const avgResult = await client.query(
          `SELECT SUM(price_paid) as total_spent, SUM(quantity) as total_qty
           FROM inventory_log
           WHERE ingredient_id = $1 AND type = 'addition' AND price_paid IS NOT NULL`,
          [data.ingredientId],
        );
        const { total_spent, total_qty } = avgResult.rows[0];
        if (total_qty > 0) {
          await client.query(
            `UPDATE ingredients SET cost_per_unit = ROUND($1::numeric / $2::numeric, 4), updated_at = NOW() WHERE id = $3 AND store_id = $4`,
            [total_spent, total_qty, data.ingredientId, storeId],
          );
        }
      }

      // Re-fetch to get updated cost_per_unit
      const updated = await client.query('SELECT * FROM ingredients WHERE id = $1 AND store_id = $2', [data.ingredientId, storeId]);

      await client.query('COMMIT');
      return this.mapRow(updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getLog(storeId: string, ingredientId: string): Promise<InventoryLog[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT il.* FROM inventory_log il
       JOIN ingredients i ON i.id = il.ingredient_id
       WHERE il.ingredient_id = $1 AND i.store_id = $2
       ORDER BY il.created_at DESC`,
      [ingredientId, storeId],
    );
    return result.rows.map((r: Record<string, unknown>) => ({
      id: r['id'] as string,
      ingredientId: r['ingredient_id'] as string,
      type: INVENTORY_LOG_TYPE_FROM_DB[r['type'] as string],
      quantity: Number(r['quantity']),
      reason: r['reason'] as string | undefined,
      pricePaid: r['price_paid'] != null ? Number(r['price_paid']) : undefined,
      createdAt: new Date(r['created_at'] as string),
    }));
  }

  static async delete(storeId: string, id: string): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM ingredients WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  private static mapRow(row: Record<string, unknown>): Ingredient {
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      unit: row['unit'] as string,
      quantity: Number(row['quantity']),
      costPerUnit: Number(row['cost_per_unit']),
      packageSize: row['package_size'] != null ? Number(row['package_size']) : undefined,
      lowStockThreshold: Number(row['low_stock_threshold']),
      supplier: row['supplier'] as string | undefined,
      notes: row['notes'] as string | undefined,
      groups: [],
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}
