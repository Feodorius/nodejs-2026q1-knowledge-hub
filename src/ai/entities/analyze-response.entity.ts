export class AnalyzeResponseEntity {
  articleId: string;
  analysis: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';

  constructor(partial: AnalyzeResponseEntity) {
    Object.assign(this, partial);
  }
}
