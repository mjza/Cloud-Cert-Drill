import crypto from 'crypto';

/**
 * Generate a unique ID with a given prefix
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a user ID
 */
export function generateUserId(): string {
  return generateId('user');
}

/**
 * Generate an exam ID
 */
export function generateExamId(): string {
  return generateId('exam');
}

/**
 * Generate a question ID
 */
export function generateQuestionId(): string {
  return generateId('q');
}

/**
 * Generate an option ID
 */
export function generateOptionId(): string {
  return generateId('opt');
}

/**
 * Generate a topic ID
 */
export function generateTopicId(): string {
  return generateId('topic');
}

/**
 * Generate a module ID
 */
export function generateModuleId(): string {
  return generateId('module');
}
