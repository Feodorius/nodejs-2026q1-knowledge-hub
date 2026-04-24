import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { instanceToPlain } from 'class-transformer';
import { UserRole, ArticleStatus } from '@prisma/client';
import { UserEntity } from './user/entities/user.entity';
import { ArticleEntity } from './article/entities/article.entity';

describe('UserEntity — password stripping', () => {
  it('excludes password field from serialized output', () => {
    const entity = new UserEntity({
      id: '11111111-1111-1111-1111-111111111111',
      login: 'testuser',
      password: 'secret-hashed-password',
      role: UserRole.VIEWER,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    });

    const plain = instanceToPlain(entity);
    expect(plain).not.toHaveProperty('password');
  });

  it('includes all non-excluded fields in serialized output', () => {
    const entity = new UserEntity({
      id: '11111111-1111-1111-1111-111111111111',
      login: 'testuser',
      password: 'secret',
      role: UserRole.ADMIN,
      createdAt: 1700000000000,
      updatedAt: 1700000000001,
    });

    const plain = instanceToPlain(entity);
    expect(plain).toHaveProperty('id');
    expect(plain).toHaveProperty('login');
    expect(plain).toHaveProperty('role');
    expect(plain).toHaveProperty('createdAt');
    expect(plain).toHaveProperty('updatedAt');
  });

  it('transforms role to lowercase', () => {
    const entity = new UserEntity({
      id: '11111111-1111-1111-1111-111111111111',
      login: 'admin',
      password: 'secret',
      role: UserRole.ADMIN,
      createdAt: 0,
      updatedAt: 0,
    });

    const plain = instanceToPlain(entity);
    expect(plain.role).toBe('admin');
  });

  it('transforms EDITOR role to lowercase', () => {
    const entity = new UserEntity({
      id: '11111111-1111-1111-1111-111111111111',
      login: 'editor',
      password: 'secret',
      role: UserRole.EDITOR,
      createdAt: 0,
      updatedAt: 0,
    });

    const plain = instanceToPlain(entity);
    expect(plain.role).toBe('editor');
  });
});

describe('ArticleEntity — status transformation', () => {
  it('transforms status to lowercase', () => {
    const entity = new ArticleEntity({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'Test',
      content: 'Content',
      status: ArticleStatus.PUBLISHED,
      authorId: null,
      categoryId: null,
      tags: [],
      createdAt: 0,
      updatedAt: 0,
    });

    const plain = instanceToPlain(entity);
    expect(plain.status).toBe('published');
  });

  it('transforms ARCHIVED status to lowercase', () => {
    const entity = new ArticleEntity({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'Test',
      content: 'Content',
      status: ArticleStatus.ARCHIVED,
      authorId: null,
      categoryId: null,
      tags: [],
      createdAt: 0,
      updatedAt: 0,
    });

    const plain = instanceToPlain(entity);
    expect(plain.status).toBe('archived');
  });

  it('includes all article fields in serialized output', () => {
    const entity = new ArticleEntity({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'Title',
      content: 'Content',
      status: ArticleStatus.DRAFT,
      authorId: '11111111-1111-1111-1111-111111111111',
      categoryId: null,
      tags: ['js'],
      createdAt: 1700000000000,
      updatedAt: 1700000000001,
    });

    const plain = instanceToPlain(entity);
    expect(plain).toMatchObject({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      title: 'Title',
      content: 'Content',
      status: 'draft',
      tags: ['js'],
    });
  });
});
