import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { SignupDto } from './auth/dto/signup.dto';
import { LoginDto } from './auth/dto/login.dto';
import { CreateUserDto } from './user/dto/create-user.dto';
import { UpdatePasswordDto } from './user/dto/update-password.dto';
import { CreateArticleDto } from './article/dto/create-article.dto';
import { UpdateArticleDto } from './article/dto/update-article.dto';
import { CreateCategoryDto } from './category/dto/create-category.dto';
import { UpdateCategoryDto } from './category/dto/update-category.dto';
import { CreateCommentDto } from './comment/dto/create-comment.dto';
import { QueryUserDto } from './user/dto/query-user.dto';
import { SortOrder } from './comment/dto/query-comment.dto';

describe('SignupDto', () => {
  it('validates successfully with login and password', async () => {
    const dto = plainToInstance(SignupDto, { login: 'user', password: 'pass' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when login is missing', async () => {
    const dto = plainToInstance(SignupDto, { password: 'pass' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'login')).toBe(true);
  });

  it('fails when password is missing', async () => {
    const dto = plainToInstance(SignupDto, { login: 'user' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('fails when login is empty string', async () => {
    const dto = plainToInstance(SignupDto, { login: '', password: 'pass' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'login')).toBe(true);
  });

  it('fails when password is empty string', async () => {
    const dto = plainToInstance(SignupDto, { login: 'user', password: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});

describe('LoginDto', () => {
  it('validates successfully with login and password', async () => {
    const dto = plainToInstance(LoginDto, { login: 'user', password: 'pass' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when login is missing', async () => {
    const dto = plainToInstance(LoginDto, { password: 'pass' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'login')).toBe(true);
  });

  it('fails when password is missing', async () => {
    const dto = plainToInstance(LoginDto, { login: 'user' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});

describe('CreateUserDto', () => {
  it('validates successfully with required fields', async () => {
    const dto = plainToInstance(CreateUserDto, {
      login: 'user',
      password: 'pass',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('validates successfully with optional role', async () => {
    const dto = plainToInstance(CreateUserDto, {
      login: 'admin',
      password: 'pass',
      role: UserRole.ADMIN,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails with invalid role enum value', async () => {
    const dto = plainToInstance(CreateUserDto, {
      login: 'user',
      password: 'pass',
      role: 'SUPERADMIN',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('fails when login is missing', async () => {
    const dto = plainToInstance(CreateUserDto, { password: 'pass' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'login')).toBe(true);
  });
});

describe('UpdatePasswordDto', () => {
  it('validates successfully with old and new password', async () => {
    const dto = plainToInstance(UpdatePasswordDto, {
      oldPassword: 'old',
      newPassword: 'new',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when oldPassword is missing', async () => {
    const dto = plainToInstance(UpdatePasswordDto, { newPassword: 'new' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'oldPassword')).toBe(true);
  });

  it('fails when newPassword is missing', async () => {
    const dto = plainToInstance(UpdatePasswordDto, { oldPassword: 'old' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });
});

describe('CreateArticleDto', () => {
  it('validates successfully with required fields', async () => {
    const dto = plainToInstance(CreateArticleDto, { title: 'T', content: 'C' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('validates successfully with all optional fields', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'T',
      content: 'C',
      status: 'DRAFT',
      authorId: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      tags: ['js', 'ts'],
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when title is missing', async () => {
    const dto = plainToInstance(CreateArticleDto, { content: 'C' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('fails when content is missing', async () => {
    const dto = plainToInstance(CreateArticleDto, { title: 'T' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'content')).toBe(true);
  });

  it('fails with invalid status enum', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'T',
      content: 'C',
      status: 'INVALID_STATUS',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });

  it('fails when authorId is not a valid UUID', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'T',
      content: 'C',
      authorId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'authorId')).toBe(true);
  });

  it('fails when categoryId is not a valid UUID', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'T',
      content: 'C',
      categoryId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'categoryId')).toBe(true);
  });

  it('allows null for authorId', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'T',
      content: 'C',
      authorId: null,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when tags contains non-string values', async () => {
    const dto = plainToInstance(CreateArticleDto, {
      title: 'T',
      content: 'C',
      tags: [123, true],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tags')).toBe(true);
  });
});

describe('UpdateArticleDto', () => {
  it('validates with empty object (all optional)', async () => {
    const dto = plainToInstance(UpdateArticleDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails with invalid status', async () => {
    const dto = plainToInstance(UpdateArticleDto, { status: 'WRONG' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'status')).toBe(true);
  });
});

describe('CreateCategoryDto', () => {
  it('validates successfully with name and description', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: 'Tech',
      description: 'Technology articles',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when name is missing', async () => {
    const dto = plainToInstance(CreateCategoryDto, { description: 'desc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });
});

describe('CreateCommentDto', () => {
  it('validates successfully with required fields', async () => {
    const dto = plainToInstance(CreateCommentDto, {
      content: 'Great article!',
      articleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when content is missing', async () => {
    const dto = plainToInstance(CreateCommentDto, {
      articleId: '550e8400-e29b-41d4-a716-446655440000',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'content')).toBe(true);
  });

  it('fails when articleId is not a valid UUID', async () => {
    const dto = plainToInstance(CreateCommentDto, {
      content: 'Comment',
      articleId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'articleId')).toBe(true);
  });

  it('fails when articleId is missing', async () => {
    const dto = plainToInstance(CreateCommentDto, { content: 'Comment' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'articleId')).toBe(true);
  });
});

describe('UpdateCategoryDto', () => {
  it('validates with empty object (all optional)', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('validates with valid fields', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {
      name: 'New',
      description: 'Desc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('QueryUserDto', () => {
  it('validates with empty object (all optional)', async () => {
    const dto = plainToInstance(QueryUserDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('validates with valid sort order ASC', async () => {
    const dto = plainToInstance(QueryUserDto, { order: SortOrder.ASC });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('validates with valid sort order DESC', async () => {
    const dto = plainToInstance(QueryUserDto, { order: SortOrder.DESC });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails with invalid sort order', async () => {
    const dto = plainToInstance(QueryUserDto, { order: 'INVALID' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'order')).toBe(true);
  });
});
