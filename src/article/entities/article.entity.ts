import { ArticleStatus } from '@prisma/client';

export class ArticleEntity {
  id: string;
  title: string;
  content: string;
  status: ArticleStatus;
  authorId: string | null;
  categoryId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;

  constructor(partial: Partial<ArticleEntity>) {
    Object.assign(this, partial);
  }
}
