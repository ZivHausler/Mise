/**
 * Builds a dynamic SQL UPDATE statement from a partial data object.
 *
 * @param table        - SQL table name
 * @param data         - Object with JS field names as keys and values to set
 * @param fieldMap     - Mapping from JS field name → SQL column name
 * @param whereClause  - SQL WHERE clause (e.g. "id = $N AND store_id = $M") using
 *                       positional params starting at the next available index
 * @param whereValues  - Values for the WHERE clause placeholders
 * @param addUpdatedAt - Whether to append `updated_at = NOW()` (default true)
 * @returns `{ query, values }` ready for pool.query(), or `null` if no fields to update
 */
export function buildDynamicUpdate(
  table: string,
  data: Record<string, unknown>,
  fieldMap: Record<string, string>,
  whereClause: string,
  whereValues: unknown[],
  addUpdatedAt = true,
): { query: string; values: unknown[] } | null {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [jsField, sqlColumn] of Object.entries(fieldMap)) {
    if (data[jsField] !== undefined) {
      setClauses.push(`${sqlColumn} = $${idx++}`);
      values.push(data[jsField]);
    }
  }

  if (setClauses.length === 0) return null;

  if (addUpdatedAt) {
    setClauses.push('updated_at = NOW()');
  }

  // Remap whereClause placeholders: replace $1, $2, ... with $N, $N+1, ...
  let mappedWhere = whereClause;
  for (let i = whereValues.length; i >= 1; i--) {
    // Replace from highest to lowest to avoid $1 matching inside $10
    mappedWhere = mappedWhere.replace(new RegExp(`\\$${i}`, 'g'), `$${idx + i - 1}`);
  }
  values.push(...whereValues);

  const query = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${mappedWhere}`;
  return { query, values };
}
