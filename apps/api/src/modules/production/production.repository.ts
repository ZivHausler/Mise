import type { ProductionBatch, BatchOrder, BatchPrepItem, ProductionStage } from './production.types.js';
import { getPool } from '../../core/database/postgres.js';

export class PgProductionRepository {
  static async findByDate(storeId: number, date: string): Promise<ProductionBatch[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM production_batches WHERE store_id = $1 AND production_date = $2::date ORDER BY priority DESC, created_at ASC`,
      [storeId, date],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapBatchRow(r));
  }

  static async findById(storeId: number, id: number): Promise<ProductionBatch | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM production_batches WHERE id = $1 AND store_id = $2`,
      [id, storeId],
    );
    if (!result.rows[0]) return null;
    const batch = this.mapBatchRow(result.rows[0]);

    // Load order sources
    const ordersResult = await pool.query(
      `SELECT * FROM batch_orders WHERE batch_id = $1 AND store_id = $2`,
      [id, storeId],
    );
    batch.orderSources = ordersResult.rows.map((r: Record<string, unknown>) => this.mapBatchOrderRow(r));

    // Load prep items
    const prepResult = await pool.query(
      `SELECT * FROM batch_prep_items WHERE batch_id = $1 AND store_id = $2 ORDER BY ingredient_name ASC`,
      [id, storeId],
    );
    batch.prepItems = prepResult.rows.map((r: Record<string, unknown>) => this.mapPrepItemRow(r));

    return batch;
  }

  static async create(
    storeId: number,
    data: {
      recipeId: string;
      recipeName: string;
      quantity: number;
      productionDate: string;
      priority: number;
      assignedTo?: string;
      source: 'auto' | 'manual';
      notes?: string;
    },
  ): Promise<ProductionBatch> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO production_batches (store_id, recipe_id, recipe_name, quantity, stage, production_date, priority, assigned_to, source, notes)
       VALUES ($1, $2, $3, $4, 0, $5::date, $6, $7, $8, $9)
       RETURNING *`,
      [storeId, data.recipeId, data.recipeName, data.quantity, data.productionDate, data.priority, data.assignedTo ?? null, data.source, data.notes ?? null],
    );
    return this.mapBatchRow(result.rows[0]);
  }

  static async updateStage(storeId: number, id: number, stage: ProductionStage): Promise<ProductionBatch> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE production_batches SET stage = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3 RETURNING *`,
      [stage, id, storeId],
    );
    return this.mapBatchRow(result.rows[0]);
  }

  static async update(storeId: number, id: number, data: Partial<{ quantity: number; priority: number; assignedTo: string | null; notes: string | null }>): Promise<ProductionBatch> {
    const pool = getPool();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.quantity !== undefined) { fields.push(`quantity = $${idx++}`); values.push(data.quantity); }
    if (data.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(data.priority); }
    if (data.assignedTo !== undefined) { fields.push(`assigned_to = $${idx++}`); values.push(data.assignedTo); }
    if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }

    fields.push(`updated_at = NOW()`);
    values.push(id, storeId);

    const result = await pool.query(
      `UPDATE production_batches SET ${fields.join(', ')} WHERE id = $${idx} AND store_id = $${idx + 1} RETURNING *`,
      values,
    );
    return this.mapBatchRow(result.rows[0]);
  }

  static async delete(storeId: number, id: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM production_batches WHERE id = $1 AND store_id = $2', [id, storeId]);
  }

  static async createBatchOrder(storeId: number, data: { batchId: number; orderId: number; orderItemIndex: number; quantityFromOrder: number }): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO batch_orders (store_id, batch_id, order_id, order_item_index, quantity_from_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [storeId, data.batchId, data.orderId, data.orderItemIndex, data.quantityFromOrder],
    );
  }

  static async createPrepItem(storeId: number, data: { batchId: number; ingredientId: number; ingredientName: string; requiredQuantity: number; unit: string }): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO batch_prep_items (store_id, batch_id, ingredient_id, ingredient_name, required_quantity, unit)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [storeId, data.batchId, data.ingredientId, data.ingredientName, data.requiredQuantity, data.unit],
    );
  }

  static async togglePrepItem(storeId: number, id: number, isPrepped: boolean): Promise<BatchPrepItem> {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE batch_prep_items SET is_prepped = $1 WHERE id = $2 AND store_id = $3 RETURNING *`,
      [isPrepped, id, storeId],
    );
    return this.mapPrepItemRow(result.rows[0]);
  }

  static async getPrepItemById(storeId: number, id: number): Promise<BatchPrepItem | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM batch_prep_items WHERE id = $1 AND store_id = $2`,
      [id, storeId],
    );
    return result.rows[0] ? this.mapPrepItemRow(result.rows[0]) : null;
  }

  static async getAggregatedPrepList(storeId: number, date: string): Promise<Array<{ ingredientId: string; ingredientName: string; totalRequired: number; unit: string; preppedCount: number; totalCount: number; items: (BatchPrepItem & { recipeName: string })[] }>> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         bpi.*,
         pb.recipe_name
       FROM batch_prep_items bpi
       JOIN production_batches pb ON pb.id = bpi.batch_id
       WHERE bpi.store_id = $1 AND pb.production_date = $2::date
       ORDER BY bpi.ingredient_name ASC`,
      [storeId, date],
    );

    const grouped = new Map<string, { ingredientId: string; ingredientName: string; totalRequired: number; unit: string; preppedCount: number; totalCount: number; items: (BatchPrepItem & { recipeName: string })[] }>();

    for (const row of result.rows) {
      const item = this.mapPrepItemRow(row as Record<string, unknown>);
      const recipeName = (row as Record<string, unknown>)['recipe_name'] as string;
      const key = String(item.ingredientId);

      if (!grouped.has(key)) {
        grouped.set(key, {
          ingredientId: String(item.ingredientId),
          ingredientName: item.ingredientName,
          totalRequired: 0,
          unit: item.unit,
          preppedCount: 0,
          totalCount: 0,
          items: [],
        });
      }
      const group = grouped.get(key)!;
      group.totalRequired += item.requiredQuantity;
      group.totalCount++;
      if (item.isPrepped) group.preppedCount++;
      group.items.push({ ...item, recipeName });
    }

    return Array.from(grouped.values());
  }

  static async getTimelineData(storeId: number, date: string): Promise<ProductionBatch[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM production_batches WHERE store_id = $1 AND production_date = $2::date ORDER BY priority DESC, created_at ASC`,
      [storeId, date],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapBatchRow(r));
  }

  static async deleteBatchOrdersByBatchId(storeId: number, batchId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM batch_orders WHERE batch_id = $1 AND store_id = $2', [batchId, storeId]);
  }

  static async deletePrepItemsByBatchId(storeId: number, batchId: number): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM batch_prep_items WHERE batch_id = $1 AND store_id = $2', [batchId, storeId]);
  }

  static async getBatchOrdersByBatchId(storeId: number, batchId: number): Promise<BatchOrder[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM batch_orders WHERE batch_id = $1 AND store_id = $2`,
      [batchId, storeId],
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapBatchOrderRow(r));
  }

  private static mapBatchRow(row: Record<string, unknown>): ProductionBatch {
    return {
      id: Number(row['id']),
      storeId: Number(row['store_id']),
      recipeId: row['recipe_id'] as string,
      recipeName: row['recipe_name'] as string,
      quantity: Number(row['quantity']),
      stage: Number(row['stage']) as ProductionStage,
      productionDate: row['production_date'] instanceof Date
        ? row['production_date'].toISOString().split('T')[0]!
        : String(row['production_date']).split('T')[0]!,
      priority: Number(row['priority']),
      assignedTo: (row['assigned_to'] as string) || undefined,
      source: row['source'] as 'auto' | 'manual',
      notes: row['notes'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  private static mapBatchOrderRow(row: Record<string, unknown>): BatchOrder {
    return {
      id: Number(row['id']),
      batchId: Number(row['batch_id']),
      orderId: Number(row['order_id']),
      orderItemIndex: Number(row['order_item_index']),
      quantityFromOrder: Number(row['quantity_from_order']),
    };
  }

  private static mapPrepItemRow(row: Record<string, unknown>): BatchPrepItem {
    return {
      id: Number(row['id']),
      batchId: Number(row['batch_id']),
      ingredientId: Number(row['ingredient_id']),
      ingredientName: row['ingredient_name'] as string,
      requiredQuantity: Number(row['required_quantity']),
      unit: row['unit'] as string,
      isPrepped: Boolean(row['is_prepped']),
    };
  }
}
