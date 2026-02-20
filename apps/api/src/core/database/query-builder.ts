export class QueryBuilder {
  private conditions: string[] = [];
  private params: unknown[] = [];
  private paramIndex: number;

  constructor(initialParam?: unknown) {
    this.paramIndex = initialParam !== undefined ? 2 : 1;
    if (initialParam !== undefined) {
      this.params.push(initialParam);
    }
  }

  addCondition(column: string, operator: string, value: unknown): this {
    this.conditions.push(`${column} ${operator} $${this.paramIndex++}`);
    this.params.push(value);
    return this;
  }

  addSearchCondition(columns: string[], search: string): this {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const orClauses = columns.map((col) => `${col} ILIKE $${this.paramIndex} ESCAPE '\\\\'`);
    this.conditions.push(`(${orClauses.join(' OR ')})`);
    this.params.push(`%${escaped}%`);
    this.paramIndex++;
    return this;
  }

  getWhereClause(): string {
    return this.conditions.length > 0 ? ` AND ${this.conditions.join(' AND ')}` : '';
  }

  getParams(): unknown[] {
    return this.params;
  }

  getNextParamIndex(): number {
    return this.paramIndex;
  }
}
