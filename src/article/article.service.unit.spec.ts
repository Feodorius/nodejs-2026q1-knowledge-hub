import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ArticleStatus } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';
import { SortOrder } from '../comment/dto/query-comment.dto';
import { ArticleService } from './article.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError, ForbiddenError } from '../common/errors';

const mockArticle = (overrides = {}) => ({
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Test Article',
  content: 'Content',
  status: ArticleStatus.DRAFT,
  authorId: '11111111-1111-1111-1111-111111111111',
  categoryId: null,
  tags: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('ArticleService', () => {
  let service: ArticleService;
  let prisma: {
    article: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      article: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [ArticleService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ArticleService);
  });

  describe('findAll', () => {
    it('returns array of articles', async () => {
      prisma.article.findMany.mockResolvedValue([mockArticle()]);
      const result = await service.findAll({});
      expect(Array.isArray(result)).toBe(true);
    });

    it('filters by status', async () => {
      prisma.article.findMany.mockResolvedValue([]);
      await service.findAll({ status: ArticleStatus.PUBLISHED });
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ArticleStatus.PUBLISHED }),
        }),
      );
    });

    it('filters by categoryId', async () => {
      const categoryId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      prisma.article.findMany.mockResolvedValue([]);
      await service.findAll({ categoryId });
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId }),
        }),
      );
    });

    it('filters by tag', async () => {
      prisma.article.findMany.mockResolvedValue([]);
      await service.findAll({ tag: 'nodejs' });
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { name: 'nodejs' } },
          }),
        }),
      );
    });

    it('returns paginated result when page and limit provided', async () => {
      prisma.article.findMany.mockResolvedValue([mockArticle()]);
      prisma.article.count.mockResolvedValue(1);
      const result = (await service.findAll({ page: 1, limit: 5 })) as any;
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('applies sorting with DESC order', async () => {
      prisma.article.findMany.mockResolvedValue([]);
      await service.findAll({ sortBy: 'title', order: SortOrder.DESC });
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'desc' } }),
      );
    });

    it('applies sorting with ASC order by default', async () => {
      prisma.article.findMany.mockResolvedValue([]);
      await service.findAll({ sortBy: 'title' });
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { title: 'asc' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns article when found', async () => {
      const article = mockArticle();
      prisma.article.findUnique.mockResolvedValue(article);
      const result = await service.findOne(article.id);
      expect(result.id).toBe(article.id);
    });

    it('throws NotFoundError when article not found', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    it('creates article with DRAFT status by default', async () => {
      const article = mockArticle();
      prisma.article.create.mockResolvedValue(article);
      await service.create({ title: 'T', content: 'C' });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ArticleStatus.DRAFT }),
        }),
      );
    });

    it('creates article with PUBLISHED status when specified', async () => {
      const article = mockArticle({ status: ArticleStatus.PUBLISHED });
      prisma.article.create.mockResolvedValue(article);
      await service.create({
        title: 'T',
        content: 'C',
        status: ArticleStatus.PUBLISHED,
      });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ArticleStatus.PUBLISHED }),
        }),
      );
    });

    it('creates article with ARCHIVED status when specified', async () => {
      const article = mockArticle({ status: ArticleStatus.ARCHIVED });
      prisma.article.create.mockResolvedValue(article);
      await service.create({
        title: 'T',
        content: 'C',
        status: ArticleStatus.ARCHIVED,
      });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ArticleStatus.ARCHIVED }),
        }),
      );
    });

    it('creates article with tags', async () => {
      const article = mockArticle({
        tags: [{ name: 'nodejs' }, { name: 'ts' }],
      });
      prisma.article.create.mockResolvedValue(article);
      const result = await service.create({
        title: 'T',
        content: 'C',
        tags: ['nodejs', 'ts'],
      });
      expect(result.tags).toEqual(['nodejs', 'ts']);
    });

    it('creates article without tags when tags array is empty', async () => {
      prisma.article.create.mockResolvedValue(mockArticle());
      await service.create({ title: 'T', content: 'C', tags: [] });
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags: undefined }),
        }),
      );
    });

    it('throws ForbiddenError when EDITOR tries to create for another author', async () => {
      await expect(
        service.create(
          {
            title: 'T',
            content: 'C',
            authorId: 'other-author-id',
          },
          {
            userId: '11111111-1111-1111-1111-111111111111',
            login: 'editor',
            role: 'editor',
          },
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows EDITOR to create article for themselves', async () => {
      const editorId = '11111111-1111-1111-1111-111111111111';
      prisma.article.create.mockResolvedValue(
        mockArticle({ authorId: editorId }),
      );
      await service.create(
        { title: 'T', content: 'C', authorId: editorId },
        { userId: editorId, login: 'editor', role: 'editor' },
      );
      expect(prisma.article.create).toHaveBeenCalled();
    });

    it('allows ADMIN to create article for any author', async () => {
      prisma.article.create.mockResolvedValue(mockArticle());
      await service.create(
        { title: 'T', content: 'C', authorId: 'some-author-id' },
        { userId: 'admin-id', login: 'admin', role: 'admin' },
      );
      expect(prisma.article.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates article when found', async () => {
      const article = mockArticle();
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.update.mockResolvedValue({ ...article, title: 'Updated' });
      const result = await service.update(article.id, { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundError when article not found', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { title: 'X' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ForbiddenError when EDITOR updates another author article', async () => {
      const article = mockArticle({ authorId: 'owner-id' });
      prisma.article.findUnique.mockResolvedValue(article);
      await expect(
        service.update(
          article.id,
          { title: 'X' },
          { userId: 'editor-id', login: 'editor', role: 'editor' },
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows EDITOR to update their own article', async () => {
      const editorId = '11111111-1111-1111-1111-111111111111';
      const article = mockArticle({ authorId: editorId });
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.update.mockResolvedValue(article);
      await service.update(
        article.id,
        { title: 'Updated' },
        { userId: editorId, login: 'editor', role: 'editor' },
      );
      expect(prisma.article.update).toHaveBeenCalled();
    });

    it('updates tags by replacing them', async () => {
      const article = mockArticle();
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.update.mockResolvedValue({
        ...article,
        tags: [{ name: 'new-tag' }],
      });
      const result = await service.update(article.id, { tags: ['new-tag'] });
      expect(result.tags).toEqual(['new-tag']);
    });

    it('does not modify tags when tags not provided in dto', async () => {
      const article = mockArticle();
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.update.mockResolvedValue(article);
      await service.update(article.id, { title: 'Only title' });
      expect(prisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tags: undefined }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('deletes article when found', async () => {
      const article = mockArticle();
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.delete.mockResolvedValue(article);
      await service.remove(article.id);
      expect(prisma.article.delete).toHaveBeenCalledWith({
        where: { id: article.id },
      });
    });

    it('throws NotFoundError when article not found', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('status transitions', () => {
    it('allows creating article with DRAFT status (initial state)', async () => {
      prisma.article.create.mockResolvedValue(
        mockArticle({ status: ArticleStatus.DRAFT }),
      );
      const result = await service.create({
        title: 'T',
        content: 'C',
        status: ArticleStatus.DRAFT,
      });
      expect(result.status).toBe(ArticleStatus.DRAFT);
    });

    it('allows transitioning article status to PUBLISHED via update', async () => {
      const article = mockArticle({ status: ArticleStatus.DRAFT });
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.update.mockResolvedValue({
        ...article,
        status: ArticleStatus.PUBLISHED,
      });
      const result = await service.update(article.id, {
        status: ArticleStatus.PUBLISHED,
      });
      expect(result.status).toBe(ArticleStatus.PUBLISHED);
    });

    it('allows transitioning article status to ARCHIVED via update', async () => {
      const article = mockArticle({ status: ArticleStatus.PUBLISHED });
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.update.mockResolvedValue({
        ...article,
        status: ArticleStatus.ARCHIVED,
      });
      const result = await service.update(article.id, {
        status: ArticleStatus.ARCHIVED,
      });
      expect(result.status).toBe(ArticleStatus.ARCHIVED);
    });

    it('service does not enforce invalid transition restrictions (any status can be set)', async () => {
      const article = mockArticle({ status: ArticleStatus.ARCHIVED });
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.article.update.mockResolvedValue({
        ...article,
        status: ArticleStatus.DRAFT,
      });
      const result = await service.update(article.id, {
        status: ArticleStatus.DRAFT,
      });
      expect(result.status).toBe(ArticleStatus.DRAFT);
    });
  });

  describe('entity mapping', () => {
    it('maps status to lowercase when serialized', async () => {
      prisma.article.findUnique.mockResolvedValue(
        mockArticle({ status: ArticleStatus.PUBLISHED }),
      );
      const result = await service.findOne('some-id');
      expect(instanceToPlain(result).status).toBe('published');
    });

    it('maps tags to string array', async () => {
      prisma.article.findUnique.mockResolvedValue(
        mockArticle({ tags: [{ name: 'js' }, { name: 'ts' }] }),
      );
      const result = await service.findOne('some-id');
      expect(result.tags).toEqual(['js', 'ts']);
    });
  });
});
