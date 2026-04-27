/**
 * Parser for converting markdown-formatted questions into structured data
 *
 * Expected format:
 * # Question Text
 * 
 * - [ ] Option 1
 * - [ ] Option 2
 * - [x] Correct Option 3
 * - [ ] Option 4
 * 
 * **Explanation:**
 * Detailed explanation of why the correct answer is right.
 * 
 * **Topic:** Topic Name
 * **Difficulty:** easy|medium|hard
 */

export interface ParsedQuestion {
  text: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  explanation?: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Parse a single question block from markdown
 */
export function parseQuestion(markdown: string): ParsedQuestion | null {
  const lines = markdown.trim().split('\n');

  let questionText = '';
  let options: ParsedQuestion['options'] = [];
  let explanation = '';
  let topic = '';
  let difficulty: 'easy' | 'medium' | 'hard' | undefined;

  let i = 0;

  // Extract question text (first line with #)
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('#')) {
      questionText = line.replace(/^#+\s*/, '').trim();
      i++;
      break;
    }
    i++;
  }

  if (!questionText) {
    return null;
  }

  // Extract options and metadata
  while (i < lines.length) {
    const line = lines[i].trim();

    // Parse option lines
    if (line.match(/^-\s*\[([ xX])\]\s/)) {
      const isCorrect = line.includes('[x]') || line.includes('[X]');
      const optionText = line.replace(/^-\s*\[([ xX])\]\s*/, '').trim();
      options.push({ text: optionText, isCorrect });
    }

    // Parse explanation
    if (line.startsWith('**Explanation:**')) {
      i++;
      const explanationLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith('**')) {
        if (lines[i].trim()) {
          explanationLines.push(lines[i].trim());
        }
        i++;
      }
      explanation = explanationLines.join(' ').trim();
      continue;
    }

    // Parse topic
    if (line.startsWith('**Topic:**')) {
      topic = line.replace('**Topic:**', '').trim();
    }

    // Parse difficulty
    if (line.startsWith('**Difficulty:**')) {
      const diffStr = line.replace('**Difficulty:**', '').trim().toLowerCase();
      if (['easy', 'medium', 'hard'].includes(diffStr)) {
        difficulty = diffStr as 'easy' | 'medium' | 'hard';
      }
    }

    i++;
  }

  // Validate
  if (options.length === 0) {
    return null;
  }

  const hasCorrectOption = options.some((o) => o.isCorrect);
  if (!hasCorrectOption) {
    return null;
  }

  return {
    text: questionText,
    options,
    explanation: explanation || undefined,
    topic: topic || undefined,
    difficulty,
  };
}

/**
 * Parse multiple questions separated by blank lines
 */
export function parseQuestions(markdown: string): ParsedQuestion[] {
  const blocks = markdown.split(/\n\n+/);
  return blocks
    .map((block) => parseQuestion(block))
    .filter((q): q is ParsedQuestion => q !== null);
}
