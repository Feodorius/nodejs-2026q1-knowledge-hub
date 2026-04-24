import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.unit.spec.ts', 'src/__tests__/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/user/user.service.ts',
        'src/article/article.service.ts',
        'src/auth/auth.service.ts',
        'src/auth/guards/jwt-auth.guard.ts',
        'src/auth/guards/roles.guard.ts',
        'src/common/pipes/parse-uuid.pipe.ts',
        'src/user/entities/user.entity.ts',
        'src/article/entities/article.entity.ts',
        'src/auth/dto/signup.dto.ts',
        'src/auth/dto/login.dto.ts',
        'src/user/dto/create-user.dto.ts',
        'src/user/dto/update-password.dto.ts',
        'src/article/dto/create-article.dto.ts',
        'src/category/dto/create-category.dto.ts',
        'src/comment/dto/create-comment.dto.ts',
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
      reporter: ['text', 'lcov'],
    },
  },
});
