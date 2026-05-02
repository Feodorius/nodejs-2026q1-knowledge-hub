export class SummarizeResponseEntity {
  articleId: string;
  summary: string;
  originalLength: number;
  summaryLength: number;

  constructor(partial: SummarizeResponseEntity) {
    Object.assign(this, partial);
  }
}
