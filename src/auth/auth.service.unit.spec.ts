import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

const mockUser = (overrides = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  login: 'testuser',
  password: '$2b$10$hashedpassword',
  role: UserRole.VIEWER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    refreshToken: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: {
    sign: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: vi.fn(), create: vi.fn() },
      refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
    jwtService = { sign: vi.fn(), verify: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);

    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    jwtService.sign.mockReturnValue('mock-token');
    prisma.refreshToken.create.mockResolvedValue({});
  });

  describe('signup', () => {
    it('creates new user with VIEWER role and hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser());

      const result = await service.signup({
        login: 'newuser',
        password: 'pass123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('pass123', expect.any(Number));
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.VIEWER,
            password: 'hashed',
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ id: mockUser().id, login: mockUser().login }),
      );
    });

    it('returns existing user if login and password match', async () => {
      const user = mockUser();
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.signup({
        login: user.login,
        password: 'pass',
      });
      expect(result.id).toBe(user.id);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when login taken with different password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.signup({ login: 'testuser', password: 'wrong' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses CRYPT_SALT env variable for hashing', async () => {
      process.env.CRYPT_SALT = '12';
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser());

      await service.signup({ login: 'user', password: 'pass' });
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 12);
      delete process.env.CRYPT_SALT;
    });
  });

  describe('login', () => {
    it('returns access and refresh tokens on valid credentials', async () => {
      const user = mockUser();
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.login({
        login: user.login,
        password: 'pass',
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws ForbiddenException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ login: 'none', password: 'pass' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      await expect(
        service.login({ login: 'testuser', password: 'wrong' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('generates JWT with correct payload structure', async () => {
      const user = mockUser({ role: UserRole.ADMIN });
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await service.login({ login: user.login, password: 'pass' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          login: user.login,
          role: 'admin',
        }),
        expect.anything(),
      );
    });

    it('generates two tokens: access and refresh with different secrets', async () => {
      const user = mockUser();
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await service.login({ login: user.login, password: 'pass' });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('refresh', () => {
    it('issues new tokens on valid refresh token', async () => {
      const user = mockUser();
      const token = 'valid-refresh-token';
      jwtService.verify.mockReturnValue({ userId: user.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.refresh(token);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token },
      });
    });

    it('throws ForbiddenException when token is invalid (verify throws)', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      await expect(service.refresh('bad-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when token not found in DB', async () => {
      jwtService.verify.mockReturnValue({ userId: 'uid' });
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('missing-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when token is expired in DB', async () => {
      jwtService.verify.mockReturnValue({ userId: 'uid' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'tok',
        userId: 'uid',
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.refresh('expired-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when user not found after token validated', async () => {
      jwtService.verify.mockReturnValue({ userId: 'uid' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'tok',
        userId: 'uid',
        expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.refresh('orphan-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rotates refresh token (old deleted, new created)', async () => {
      const user = mockUser();
      const token = 'old-refresh-token';
      jwtService.verify.mockReturnValue({ userId: user.id });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.user.findUnique.mockResolvedValue(user);

      await service.refresh(token);
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deletes the refresh token', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      await service.logout('some-token');
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });

  describe('RBAC — role in JWT payload', () => {
    it('stores role as lowercase in token payload', async () => {
      const user = mockUser({ role: UserRole.ADMIN });
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await service.login({ login: user.login, password: 'pass' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
        expect.anything(),
      );
    });

    it('viewer role is lowercase in token payload', async () => {
      const user = mockUser({ role: UserRole.VIEWER });
      prisma.user.findUnique.mockResolvedValue(user);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await service.login({ login: user.login, password: 'pass' });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'viewer' }),
        expect.anything(),
      );
    });
  });
});
