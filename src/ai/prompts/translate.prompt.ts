export function buildTranslatePrompt(
  title: string,
  content: string,
  targetLanguage: string,
  sourceLanguage?: string,
): string {
  const sourcePart = sourceLanguage ? `from ${sourceLanguage} ` : '';
  return `Translate the following article ${sourcePart}to ${targetLanguage}. Return a JSON object with exactly these fields:
{
  "translatedText": "<full translated content>",
  "detectedLanguage": "<detected or assumed source language name>"
}
Return only the JSON object, no markdown fences.

Title: ${title}

Content:
${content}`;
}
