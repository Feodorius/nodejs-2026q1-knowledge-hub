import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ParseUuidPipe } from './parse-uuid.pipe';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();

  it('passes valid UUID v4 through unchanged', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('passes valid UUID v1 through unchanged', () => {
    const uuid = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('throws BadRequestException for plain string', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for empty string', () => {
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('throws BadRequestException for UUID with wrong format', () => {
    expect(() => pipe.transform('550e8400-e29b-41d4-a716-4466554400')).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for UUID with extra characters', () => {
    expect(() =>
      pipe.transform('550e8400-e29b-41d4-a716-446655440000-extra'),
    ).toThrow(BadRequestException);
  });

  it('throws BadRequestException for numeric string', () => {
    expect(() => pipe.transform('12345')).toThrow(BadRequestException);
  });

  it('error message contains the invalid value', () => {
    try {
      pipe.transform('bad-value');
    } catch (e) {
      expect((e as BadRequestException).message).toContain('bad-value');
    }
  });
});
