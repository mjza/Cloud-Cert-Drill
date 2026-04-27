import sqlite3 from 'sqlite3';
import { queryAll, queryOne } from '../db/connection.js';
import { generateId } from '../utils/id.js';

export interface ExamGenerationInput {
  userId: string;
  moduleId: string;
  questionCount?: number;
  durationMinutes?: number;
}

export interface ExamQuestion {
  questionId: string;
  position: number;
  optionOrder?: string[];
}

/**
 * Funny exam names for variety
 */
const FUNNY_NAMES = [
  'Cloud Goblin Trial',
  'The S3 Sandwich',
  'Elastic Brain Sprint',
  'Lambda Llama Challenge',
  'Route 53 Rodeo',
  'IAM Not Ready',
  'The VPC Volcano',
  'DynamoDB Dash',
  'CloudFront Fiesta',
  'RDS Reality Check',
  'Snapshot Scavenger Hunt',
  'Encryption Extravaganza',
  'API Gateway Gauntlet',
  'Load Balancer Labyrinth',
  'SQS Queue Quest',
];

function getRandomFunnyName(): string {
  return FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)];
}

/**
 * Generate a new exam for a user in a module
 */
export async function generateExam(db: sqlite3.Database, input: ExamGenerationInput): Promise<string> {
  // Get module details
  const moduleSql = `
    SELECT default_question_count, default_duration_minutes FROM modules WHERE id = ?
  `;
  const module = await queryOne<any>(db, moduleSql, [input.moduleId]);
  if (!module) {
    throw new Error(`Module ${input.moduleId} not found`);
  }

  const questionCount = input.questionCount || module.default_question_count;
  const durationMinutes = input.durationMinutes || module.default_duration_minutes;

  // Get module topic distribution
  const moduleTopicsSql = `
    SELECT topic_id, percentage FROM module_topics WHERE module_id = ? ORDER BY percentage DESC
  `;
  const moduleTopics = await queryAll<any>(db, moduleTopicsSql, [input.moduleId]);
  if (moduleTopics.length === 0) {
    throw new Error(`Module ${input.moduleId} has no topics configured`);
  }

  // Allocate questions per topic
  const topicAllocations = allocateQuestionsByTopic(questionCount, moduleTopics);

  // Select questions based on allocation and weakness weighting
  const selectedQuestions = await selectQuestionsByTopic(db, input.userId, topicAllocations);

  if (selectedQuestions.length === 0) {
    throw new Error('Could not generate exam - no questions available');
  }

  // Shuffle questions and assign positions
  const shuffledQuestions = shuffleArray(selectedQuestions);

  // Create exam record
  const examId = generateId('exam');
  const now = new Date().toISOString();
  const examName = getRandomFunnyName();

  const createExamSql = `
    INSERT INTO exams (
      exam_id, user_id, module_id, name, status, duration_minutes,
      question_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await new Promise<void>((resolve, reject) => {
    db.run(
      createExamSql,
      [
        examId,
        input.userId,
        input.moduleId,
        examName,
        'ready',
        durationMinutes,
        shuffledQuestions.length,
        now,
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  // Insert exam questions with option order
  const examQuestionsSql = `
    INSERT INTO exam_questions (
      exam_id, question_id, position, option_order_json, marked_for_review
    ) VALUES (?, ?, ?, ?, ?)
  `;

  for (let i = 0; i < shuffledQuestions.length; i++) {
    const question = shuffledQuestions[i];

    // Get question options
    const optionsSql = 'SELECT id FROM options WHERE question_id = ? ORDER BY display_order';
    const options = await queryAll<any>(db, optionsSql, [question.questionId]);
    const optionIds = options.map((o) => o.id);

    // Check if we should shuffle options
    const questionDetailsSql = 'SELECT lock_orders FROM questions WHERE id = ?';
    const questionDetails = await queryOne<any>(db, questionDetailsSql, [question.questionId]);

    let optionOrder = null;
    if (!questionDetails.lock_orders) {
      // Shuffle options
      const shuffledOptions = shuffleArray([...optionIds]);
      optionOrder = JSON.stringify(shuffledOptions);
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        examQuestionsSql,
        [examId, question.questionId, i + 1, optionOrder, 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  return examId;
}

/**
 * Allocate question count per topic based on module percentages
 */
function allocateQuestionsByTopic(
  totalQuestions: number,
  moduleTopics: Array<{ topic_id: string; percentage: number }>
): Map<string, number> {
  const allocations = new Map<string, number>();

  // Calculate raw allocations
  const allocationsWithRemainder = moduleTopics.map((mt) => {
    const raw = (totalQuestions * mt.percentage) / 100;
    return {
      topicId: mt.topic_id,
      floor: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    };
  });

  // Assign floor values
  let allocated = 0;
  for (const alloc of allocationsWithRemainder) {
    allocations.set(alloc.topicId, alloc.floor);
    allocated += alloc.floor;
  }

  // Distribute remaining questions by remainder size
  let remaining = totalQuestions - allocated;
  const sorted = allocationsWithRemainder
    .filter((a) => a.remainder > 0)
    .sort((a, b) => b.remainder - a.remainder);

  for (const alloc of sorted) {
    if (remaining > 0) {
      allocations.set(alloc.topicId, (allocations.get(alloc.topicId) || 0) + 1);
      remaining--;
    }
  }

  return allocations;
}

/**
 * Select questions for each topic using weakness weighting
 */
async function selectQuestionsByTopic(
  db: sqlite3.Database,
  userId: string,
  topicAllocations: Map<string, number>
): Promise<Array<{ questionId: string; topicId: string }>> {
  const selectedQuestions: Array<{ questionId: string; topicId: string }> = [];

  for (const [topicId, count] of topicAllocations.entries()) {
    const candidatesSql = `
      SELECT DISTINCT q.id FROM questions q
      WHERE q.topic_id = ? AND q.is_active = 1
      ORDER BY RANDOM()
      LIMIT ?
    `;

    const candidates = await queryAll<any>(db, candidatesSql, [topicId, count * 3]);

    if (candidates.length === 0) {
      // Not enough questions in this topic
      console.warn(`Warning: Topic ${topicId} does not have enough questions`);
      continue;
    }

    // Get weakness scores for each candidate
    const questionsWithScores: Array<{ id: string; score: number }> = [];

    for (const candidate of candidates) {
      const score = await getWeaknessScore(db, userId, candidate.id);
      questionsWithScores.push({ id: candidate.id, score });
    }

    // Weighted random selection based on weakness score
    const selected = weightedRandomSelect(questionsWithScores, count);
    for (const questionId of selected) {
      selectedQuestions.push({ questionId, topicId });
    }
  }

  return selectedQuestions;
}

/**
 * Calculate weakness score for a question based on user history
 */
async function getWeaknessScore(db: sqlite3.Database, userId: string, questionId: string): Promise<number> {
  const sql = `
    SELECT COUNT(*) as fail_count FROM statistics
    WHERE user_id = ? AND question_id = ? AND score < 1
  `;

  const result = await queryOne<any>(db, sql, [userId, questionId]);
  const failureCount = result?.fail_count || 0;

  // Base weight + failure boost (capped at 5 to prevent single question dominance)
  const baseWeight = 1;
  const failureBoost = Math.min(failureCount * 0.75, 4);
  const finalScore = baseWeight + failureBoost;

  return Math.min(finalScore, 5);
}

/**
 * Weighted random selection from scored items
 */
function weightedRandomSelect(
  items: Array<{ id: string; score: number }>,
  count: number
): string[] {
  const selected: string[] = [];
  const remaining = [...items];

  while (selected.length < count && remaining.length > 0) {
    // Calculate total weight
    const totalWeight = remaining.reduce((sum, item) => sum + item.score, 0);

    // Pick a random weighted item
    let random = Math.random() * totalWeight;
    let selectedItem = remaining[0];

    for (const item of remaining) {
      random -= item.score;
      if (random <= 0) {
        selectedItem = item;
        break;
      }
    }

    selected.push(selectedItem.id);

    // Remove from remaining to avoid duplicates
    const index = remaining.findIndex((i) => i.id === selectedItem.id);
    remaining.splice(index, 1);
  }

  return selected;
}

/**
 * Shuffle an array in place using Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
