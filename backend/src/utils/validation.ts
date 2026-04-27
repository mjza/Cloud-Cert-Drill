import sqlite3 from 'sqlite3';
import { queryAll } from '../db/connection.js';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate user name
 */
export function validateUserName(name: string): ValidationResult {
  const errors: ValidationError[] = [];

  const trimmed = name.trim();
  if (!trimmed) {
    errors.push({ field: 'name', message: 'User name cannot be empty' });
  } else if (trimmed.length < 2) {
    errors.push({ field: 'name', message: 'User name must be at least 2 characters' });
  } else if (trimmed.length > 100) {
    errors.push({ field: 'name', message: 'User name must be at most 100 characters' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate topic
 */
export function validateTopic(name: string, description?: string): ValidationResult {
  const errors: ValidationError[] = [];

  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.push({ field: 'name', message: 'Topic name cannot be empty' });
  } else if (trimmedName.length < 2) {
    errors.push({ field: 'name', message: 'Topic name must be at least 2 characters' });
  } else if (trimmedName.length > 255) {
    errors.push({ field: 'name', message: 'Topic name must be at most 255 characters' });
  }

  if (description && description.length > 1000) {
    errors.push({ field: 'description', message: 'Description must be at most 1000 characters' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate module topic percentages sum to 100
 */
export function validateModuleTopicPercentages(percentages: number[]): ValidationResult {
  const errors: ValidationError[] = [];

  const sum = percentages.reduce((a, b) => a + b, 0);
  // Allow for floating point tolerance (99.5 to 100.5)
  if (sum < 99.5 || sum > 100.5) {
    errors.push({
      field: 'topics',
      message: `Topic percentages must sum to 100 (got ${sum.toFixed(2)})`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate question
 */
export function validateQuestion(text: string, optionCount: number, hasCorrectAnswer: boolean): ValidationResult {
  const errors: ValidationError[] = [];

  const trimmedText = text.trim();
  if (!trimmedText) {
    errors.push({ field: 'text', message: 'Question text cannot be empty' });
  } else if (trimmedText.length < 5) {
    errors.push({ field: 'text', message: 'Question text must be at least 5 characters' });
  } else if (trimmedText.length > 5000) {
    errors.push({ field: 'text', message: 'Question text must be at most 5000 characters' });
  }

  if (optionCount < 2) {
    errors.push({ field: 'options', message: 'Question must have at least 2 options' });
  } else if (optionCount > 10) {
    errors.push({ field: 'options', message: 'Question must have at most 10 options' });
  }

  if (!hasCorrectAnswer) {
    errors.push({ field: 'options', message: 'Question must have at least one correct answer' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate option
 */
export function validateOption(text: string): ValidationResult {
  const errors: ValidationError[] = [];

  const trimmedText = text.trim();
  if (!trimmedText) {
    errors.push({ field: 'text', message: 'Option text cannot be empty' });
  } else if (trimmedText.length < 2) {
    errors.push({ field: 'text', message: 'Option text must be at least 2 characters' });
  } else if (trimmedText.length > 500) {
    errors.push({ field: 'text', message: 'Option text must be at most 500 characters' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if exam can be started
 */
export async function canStartExam(db: sqlite3.Database, examId: string): Promise<{ canStart: boolean; reason?: string }> {
  const sql = 'SELECT status FROM exams WHERE exam_id = ?';
  const result = await (new Promise<any>((resolve, reject) => {
    db.get(sql, [examId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }));

  if (!result) {
    return { canStart: false, reason: 'Exam not found' };
  }

  if (result.status === 'in_progress') {
    return { canStart: false, reason: 'Exam is already in progress' };
  }

  if (result.status === 'submitted' || result.status === 'expired' || result.status === 'completed') {
    return { canStart: false, reason: 'Exam cannot be started after submission' };
  }

  return { canStart: true };
}

/**
 * Check if answers can be recorded
 */
export async function canRecordAnswers(db: sqlite3.Database, examId: string): Promise<{ canRecord: boolean; reason?: string }> {
  const sql = `
    SELECT status, expires_at FROM exams WHERE exam_id = ?
  `;
  const result = await (new Promise<any>((resolve, reject) => {
    db.get(sql, [examId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }));

  if (!result) {
    return { canRecord: false, reason: 'Exam not found' };
  }

  if (result.status !== 'in_progress') {
    return { canRecord: false, reason: `Cannot record answers for exam in ${result.status} status` };
  }

  if (result.expires_at && new Date(result.expires_at) < new Date()) {
    return { canRecord: false, reason: 'Exam has expired' };
  }

  return { canRecord: true };
}
