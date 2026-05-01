const LENGTH_INSTRUCTIONS = {
  short: '1-2 sentences (50-100 words)',
  medium: '1 paragraph (100-200 words)',
  detailed: '2-3 paragraphs (200-400 words)',
};

export function buildSummarizePrompt(
  title: string,
  content: string,
  maxLength: 'short' | 'medium' | 'detailed',
): string {
  return `Summarize the following article in ${LENGTH_INSTRUCTIONS[maxLength]}. Return only the summary text with no preamble or labels.

Title: ${title}

Content:
${content}`;
}
