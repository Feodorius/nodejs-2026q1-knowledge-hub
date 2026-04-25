import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { instanceToPlain } from 'class-transformer';
import { Test } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../common/errors';
import { SortOrder } from '../comment/dto/query-comment.dto';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = (overrides = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  login: 'testuser',
  password: 'hashedpass',
  role: UserRole.VIEWER,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('UserService', () => {
  let service: UserService;
  let prisma: {
    user: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    comment: { deleteMany: ReturnType<typeof vi.fn> };
    article: { updateMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      comment: { deleteMany: vi.fn() },
      article: { updateMany: vi.fn() },
      $transaction: vi.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UserService);
  });

  describe('findAll', () => {
    it('returns array of UserEntity when no pagination', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser()]);
      const result = await service.findAll({});
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[])[0].id).toBe(mockUser().id);
    });

    it('returns paginated result when page and limit provided', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser()]);
      prisma.user.count.mockResolvedValue(1);
      const result = (await service.findAll({ page: 1, limit: 10 })) as any;
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('applies sorting when sortBy provided', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.findAll({ sortBy: 'login', order: SortOrder.ASC });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { login: 'asc' } }),
      );
    });

    it('applies DESC sorting', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.findAll({ sortBy: 'login', order: SortOrder.DESC });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { login: 'desc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns UserEntity when found', async () => {
      const user = mockUser();
      prisma.user.findUnique.mockResolvedValue(user);
      const result = await service.findOne(user.id);
      expect(result.id).toBe(user.id);
      expect(result.login).toBe(user.login);
    });

    it('throws NotFoundError when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    it('creates user with VIEWER role by default', async () => {
      const user = mockUser();
      prisma.user.create.mockResolvedValue(user);
      const result = await service.create({
        login: 'testuser',
        password: 'pass',
      });
      expect(result.id).toBe(user.id);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.VIEWER }),
        }),
      );
    });

    it('creates user with specified role', async () => {
      const user = mockUser({ role: UserRole.ADMIN });
      prisma.user.create.mockResolvedValue(user);
      await service.create({
        login: 'admin',
        password: 'pass',
        role: UserRole.ADMIN,
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.ADMIN }),
        }),
      );
    });

    it('throws ValidationError on duplicate login', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );
      prisma.user.create.mockRejectedValue(error);
      await expect(
        service.create({ login: 'duplicate', password: 'pass' }),
      ).rejects.toThrow(ValidationError);
    });

    it('rethrows unknown errors', async () => {
      const error = new Error('DB connection failed');
      prisma.user.create.mockRejectedValue(error);
      await expect(
        service.create({ login: 'user', password: 'pass' }),
      ).rejects.toThrow('DB connection failed');
    });
  });

  describe('updatePassword', () => {
    it('allows user to update their own password', async () => {
      const user = mockUser({ password: 'oldpass' });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, password: 'newpass' });

      await service.updatePassword(
        user.id,
        { oldPassword: 'oldpass', newPassword: 'newpass' },
        { userId: user.id, login: user.login, role: 'viewer' },
      );
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('allows admin to update any user password', async () => {
      const user = mockUser({ password: 'oldpass' });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      await service.updatePassword(
        user.id,
        { oldPassword: 'oldpass', newPassword: 'newpass' },
        { userId: 'other-id', login: 'admin', role: 'admin' },
      );
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('throws ForbiddenError when non-admin updates another user', async () => {
      const user = mockUser({ password: 'oldpass' });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.updatePassword(
          user.id,
          { oldPassword: 'oldpass', newPassword: 'newpass' },
          { userId: 'other-id', login: 'viewer', role: 'viewer' },
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws NotFoundError when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updatePassword('missing-id', {
          oldPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when old password is incorrect', async () => {
      const user = mockUser({ password: 'correct' });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.updatePassword(user.id, {
          oldPassword: 'wrong',
          newPassword: 'new',
        }),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('remove', () => {
    it('deletes user and cascades comments, nullifies articles', async () => {
      const user = mockUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.$transaction.mockResolvedValue([]);

      await service.remove(user.id);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundError when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('entity mapping', () => {
    it('maps role to lowercase when serialized', async () => {
      prisma.user.findUnique.mockResolvedValue(
        mockUser({ role: UserRole.ADMIN }),
      );
      const result = await service.findOne('some-id');
      expect(instanceToPlain(result).role).toBe('admin');
    });

    it('maps dates to timestamps', async () => {
      const date = new Date('2024-06-01');
      prisma.user.findUnique.mockResolvedValue(
        mockUser({ createdAt: date, updatedAt: date }),
      );
      const result = await service.findOne('some-id');
      expect(result.createdAt).toBe(date.getTime());
      expect(result.updatedAt).toBe(date.getTime());
    });
  });
});
