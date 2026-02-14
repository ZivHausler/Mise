import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalError,
} from '../../../src/core/errors/app-error.js';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should set message, statusCode, errorCode, and isOperational', () => {
      const error = new AppError('Something went wrong', 500, 'CUSTOM', false);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('CUSTOM');
      expect(error.isOperational).toBe(false);
    });

    it('should default isOperational to true', () => {
      const error = new AppError('Test', 400, 'TEST');
      expect(error.isOperational).toBe(true);
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test', 400, 'TEST');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('ValidationError', () => {
    it('should have status 400 and default error code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
    });

    it('should accept custom error code', () => {
      const error = new ValidationError('Bad field', 'FIELD_ERROR');
      expect(error.errorCode).toBe('FIELD_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('should have status 404 and default error code', () => {
      const error = new NotFoundError('Item not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('UnauthorizedError', () => {
    it('should have status 401 with default message', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
      expect(error.errorCode).toBe('UNAUTHORIZED');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError', () => {
    it('should have status 403 with default message', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('ConflictError', () => {
    it('should have status 409', () => {
      const error = new ConflictError('Duplicate entry');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT');
    });
  });

  describe('InternalError', () => {
    it('should have status 500 and isOperational false', () => {
      const error = new InternalError();
      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(false);
    });
  });
});
