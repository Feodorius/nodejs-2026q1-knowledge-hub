export class CommentEntity {
  id: string;
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: number;

  constructor(partial: Partial<CommentEntity>) {
    Object.assign(this, partial);
  }
}
