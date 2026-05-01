export class TranslateResponseEntity {
  articleId: string;
  translatedText: string;
  detectedLanguage: string;

  constructor(partial: TranslateResponseEntity) {
    Object.assign(this, partial);
  }
}
