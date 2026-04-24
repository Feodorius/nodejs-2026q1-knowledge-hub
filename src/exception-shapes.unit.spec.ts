import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate as validateUuid } from 'uuid';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

describe('Exception shapes and HTTP status codes', () => {
  describe('NotFoundException', () => {
    it('has HTTP status 404', () => {
      const error = new NotFoundException('Resource not found');
      expect(error.getStatus()).toBe(404);
    });

    it('response body contains message and error', () => {
      const error = new NotFoundException('Article 123 not found');
      const response = error.getResponse() as any;
      expect(response.message).toBe('Article 123 not found');
      expect(response.statusCode).toBe(404);
    });
  });

  describe('ForbiddenException', () => {
    it('has HTTP status 403', () => {
      const error = new ForbiddenException('Insufficient permissions');
      expect(error.getStatus()).toBe(403);
    });

    it('response body contains message', () => {
      const error = new ForbiddenException(
        'Editors can only update their own articles',
      );
      const response = error.getResponse() as any;
      expect(response.message).toBe(
        'Editors can only update their own articles',
      );
      expect(response.statusCode).toBe(403);
    });
  });

  describe('BadRequestException', () => {
    it('has HTTP status 400', () => {
      const error = new BadRequestException('Login is already taken');
      expect(error.getStatus()).toBe(400);
    });

    it('response body contains message', () => {
      const error = new BadRequestException('Invalid UUID: bad-value');
      const response = error.getResponse() as any;
      expect(response.message).toBe('Invalid UUID: bad-value');
      expect(response.statusCode).toBe(400);
    });
  });

  describe('UnauthorizedException', () => {
    it('has HTTP status 401', () => {
      const error = new UnauthorizedException(
        'Access token is invalid or expired',
      );
      expect(error.getStatus()).toBe(401);
    });

    it('response body contains message', () => {
      const error = new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
      const response = error.getResponse() as any;
      expect(response.message).toBe('Missing or invalid Authorization header');
      expect(response.statusCode).toBe(401);
    });
  });
});

describe('Edge cases — explicit coverage', () => {
  describe('Malformed UUID inputs', () => {
    it('empty string is not a valid UUID', () => {
      expect(validateUuid('')).toBe(false);
    });

    it('plain string is not a valid UUID', () => {
      expect(validateUuid('not-a-uuid')).toBe(false);
    });

    it('valid v4 UUID passes validation', () => {
      expect(validateUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });
  });
});
