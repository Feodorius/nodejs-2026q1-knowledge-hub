import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

const makeContext = (
  overrides: {
    headers?: Record<string, string>;
    user?: any;
    handlerMeta?: any;
    classMeta?: any;
  } = {},
): ExecutionContext => {
  const request = {
    headers: overrides.headers ?? {},
    user: overrides.user ?? undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
    _handlerMeta: overrides.handlerMeta,
    _classMeta: overrides.classMeta,
  } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verify: ReturnType<typeof vi.fn> };
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    jwtService = { verify: vi.fn() };
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('returns true for @Public() routes', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = makeContext({ headers: {} });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true and sets request.user for valid Bearer token', () => {
    const payload = { userId: '123', login: 'user', role: 'viewer' };
    jwtService.verify.mockReturnValue(payload);
    const headers = { authorization: 'Bearer valid-token' };
    const ctx = makeContext({ headers });
    const request = ctx.switchToHttp().getRequest();

    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.user).toEqual(payload);
  });

  it('throws UnauthorizedException when Authorization header is missing', () => {
    const ctx = makeContext({ headers: {} });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when Authorization header does not start with Bearer', () => {
    const ctx = makeContext({ headers: { authorization: 'Basic abc123' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is malformed', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const ctx = makeContext({ headers: { authorization: 'Bearer bad.token' } });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is expired', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const ctx = makeContext({
      headers: { authorization: 'Bearer expired-token' },
    });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('returns true when no @Roles() metadata is set', () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    const ctx = makeContext({ user: { role: 'viewer' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when @Roles() metadata is empty array', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = makeContext({ user: { role: 'viewer' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = makeContext({ user: { role: 'admin' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when user has one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.ADMIN,
      UserRole.EDITOR,
    ]);
    const ctx = makeContext({ user: { role: 'editor' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user role is insufficient', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = makeContext({ user: { role: 'viewer' } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when EDITOR tries ADMIN-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = makeContext({ user: { role: 'editor' } });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('returns false when user is not present on request', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const ctx = makeContext({ user: undefined });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  describe('VIEWER role edge cases', () => {
    it('VIEWER is forbidden from EDITOR+ADMIN route', () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.EDITOR,
        UserRole.ADMIN,
      ]);
      const ctx = makeContext({ user: { role: 'viewer' } });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('VIEWER is forbidden from EDITOR-only route', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.EDITOR]);
      const ctx = makeContext({ user: { role: 'viewer' } });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('ForbiddenException thrown for insufficient role has status 403', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const ctx = makeContext({ user: { role: 'viewer' } });
      try {
        guard.canActivate(ctx);
      } catch (e) {
        expect((e as ForbiddenException).getStatus()).toBe(403);
      }
    });
  });
});
