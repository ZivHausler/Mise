import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../../../src/core/database/query-builder.js';

describe('QueryBuilder', () => {
  it('should start with empty state when no initial param', () => {
    const qb = new QueryBuilder();
    expect(qb.getWhereClause()).toBe('');
    expect(qb.getParams()).toEqual([]);
    expect(qb.getNextParamIndex()).toBe(1);
  });

  it('should start at param index 2 when initial param provided', () => {
    const qb = new QueryBuilder(42);
    expect(qb.getParams()).toEqual([42]);
    expect(qb.getNextParamIndex()).toBe(2);
  });

  it('should add a simple condition', () => {
    const qb = new QueryBuilder(1);
    qb.addCondition('status', '=', 'active');

    expect(qb.getWhereClause()).toBe(' AND status = $2');
    expect(qb.getParams()).toEqual([1, 'active']);
  });

  it('should chain multiple conditions', () => {
    const qb = new QueryBuilder(1);
    qb.addCondition('status', '=', 'active')
      .addCondition('created_at', '>=', '2025-01-01')
      .addCondition('amount', '<', 500);

    expect(qb.getWhereClause()).toBe(' AND status = $2 AND created_at >= $3 AND amount < $4');
    expect(qb.getParams()).toEqual([1, 'active', '2025-01-01', 500]);
    expect(qb.getNextParamIndex()).toBe(5);
  });

  it('should add search condition across multiple columns', () => {
    const qb = new QueryBuilder(1);
    qb.addSearchCondition(['name', 'email'], 'test');

    expect(qb.getWhereClause()).toContain('ILIKE');
    expect(qb.getWhereClause()).toContain('name');
    expect(qb.getWhereClause()).toContain('email');
    expect(qb.getWhereClause()).toContain('OR');
    expect(qb.getParams()).toEqual([1, '%test%']);
  });

  it('should escape special SQL LIKE characters in search', () => {
    const qb = new QueryBuilder();
    qb.addSearchCondition(['name'], '100%_off\\deal');

    const params = qb.getParams();
    // % _ and \ should be escaped
    expect(params[0]).toBe('%100\\%\\_off\\\\deal%');
  });

  it('should combine conditions and search', () => {
    const qb = new QueryBuilder(1);
    qb.addCondition('status', '=', 'active')
      .addSearchCondition(['name', 'phone'], 'john');

    const clause = qb.getWhereClause();
    expect(clause).toContain('status = $2');
    expect(clause).toContain('name ILIKE $3');
    expect(clause).toContain('phone ILIKE $3');
    expect(qb.getParams()).toEqual([1, 'active', '%john%']);
  });

  it('should return empty WHERE clause when no conditions', () => {
    const qb = new QueryBuilder(1);
    expect(qb.getWhereClause()).toBe('');
  });

  it('should work without initial param for standalone queries', () => {
    const qb = new QueryBuilder();
    qb.addCondition('active', '=', true);

    expect(qb.getWhereClause()).toBe(' AND active = $1');
    expect(qb.getParams()).toEqual([true]);
  });
});
