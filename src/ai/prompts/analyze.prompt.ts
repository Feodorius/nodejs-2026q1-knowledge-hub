const TASK_INSTRUCTIONS: Record<string, string> = {
  review: 'perform a general quality review',
  bugs: 'identify potential bugs, errors, or logical issues',
  optimize: 'suggest performance and readability optimizations',
  explain: 'explain the content in simple terms for a general audience',
};

export function buildAnalyzePrompt(
  title: string,
  content: string,
  task: 'review' | 'bugs' | 'optimize' | 'explain',
): string {
  return `Analyze the following article and ${TASK_INSTRUCTIONS[task]}. Return ONLY a valid JSON object matching this exact schema:
{
  "analysis": "<string: main analysis paragraph>",
  "suggestions": ["<string>", "<string>"],
  "severity": "<one of: info | warning | error>"
}
Choose severity based on how critical the findings are: info = minor/no issues, warning = moderate issues, error = serious problems.
Return only the JSON object, no markdown fences.

Title: ${title}

Content:
${content}`;
}
