import sqlite3 from 'sqlite3';
import { generateId, generateTopicId, generateModuleId } from '../utils/id.js';
import { validateUserName, validateTopic, validateModuleTopicPercentages } from '../utils/validation.js';
import { generateExam } from '../services/examGeneration.js';
import { logger } from '../utils/logger.js';
import { queryOne, queryAll } from '../db/connection.js';

export interface ResolverContext {
  db: sqlite3.Database;
}

/**
 * Mutations for creating and managing topics, modules, questions, and exams
 */
export const mutations = {
  async createTopic(
    _: any,
    { input }: { input: { name: string; description?: string } },
    context: ResolverContext
  ) {
    try {
      const validation = validateTopic(input.name, input.description);
      if (!validation.valid) {
        throw new Error(validation.errors.map((e) => e.message).join(', '));
      }

      const topicId = generateTopicId();
      const now = new Date().toISOString();
      const sql = `
        INSERT INTO topics (id, name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      await new Promise<void>((resolve, reject) => {
        context.db.run(sql, [topicId, input.name.trim(), input.description?.trim() || null, now, now], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        id: topicId,
        name: input.name.trim(),
        description: input.description?.trim(),
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Failed to create topic:', error);
      throw error;
    }
  },

  async updateTopic(
    _: any,
    { id, input }: { id: string; input: { name: string; description?: string } },
    context: ResolverContext
  ) {
    try {
      const validation = validateTopic(input.name, input.description);
      if (!validation.valid) {
        throw new Error(validation.errors.map((e) => e.message).join(', '));
      }

      const now = new Date().toISOString();
      const sql = `
        UPDATE topics SET name = ?, description = ?, updated_at = ? WHERE id = ?
      `;

      await new Promise<void>((resolve, reject) => {
        context.db.run(sql, [input.name.trim(), input.description?.trim() || null, now, id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        id,
        name: input.name.trim(),
        description: input.description?.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: now,
      };
    } catch (error) {
      logger.error('Failed to update topic:', error);
      throw error;
    }
  },

  async deleteTopic(_: any, { id }: { id: string }, context: ResolverContext) {
    try {
      // Check if topic is used in any modules
      const usedSql = 'SELECT COUNT(*) as count FROM module_topics WHERE topic_id = ?';
      const used = await queryOne<any>(context.db, usedSql, [id]);

      if (used && used.count > 0) {
        throw new Error('Cannot delete topic that is used in modules');
      }

      const sql = 'DELETE FROM topics WHERE id = ?';
      await new Promise<void>((resolve, reject) => {
        context.db.run(sql, [id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete topic:', error);
      throw error;
    }
  },

  async createModule(
    _: any,
    {
      input,
    }: {
      input: {
        name: string;
        description?: string;
        defaultQuestionCount?: number;
        defaultDurationMinutes?: number;
        passingScore?: number;
        topics: Array<{ topicId: string; percentage: number }>;
      };
    },
    context: ResolverContext
  ) {
    try {
      // Validate topic percentages
      const percentages = input.topics.map((t) => t.percentage);
      const validation = validateModuleTopicPercentages(percentages);
      if (!validation.valid) {
        throw new Error(validation.errors.map((e) => e.message).join(', '));
      }

      const moduleId = generateModuleId();
      const now = new Date().toISOString();

      const moduleSql = `
        INSERT INTO modules (
          id, name, description, default_question_count,
          default_duration_minutes, passing_score, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await new Promise<void>((resolve, reject) => {
        context.db.run(
          moduleSql,
          [
            moduleId,
            input.name,
            input.description || null,
            input.defaultQuestionCount || 65,
            input.defaultDurationMinutes || 130,
            input.passingScore || null,
            now,
            now,
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Insert module-topic relationships
      const topicSql = 'INSERT INTO module_topics (module_id, topic_id, percentage) VALUES (?, ?, ?)';
      for (const topic of input.topics) {
        await new Promise<void>((resolve, reject) => {
          context.db.run(topicSql, [moduleId, topic.topicId, topic.percentage], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Fetch and return the created module
      const created = await queryOne<any>(
        context.db,
        `SELECT id, name, description, default_question_count,
                default_duration_minutes, passing_score, created_at, updated_at FROM modules WHERE id = ?`,
        [moduleId]
      );

      const topicsData = await queryAll<any>(
        context.db,
        `SELECT t.id, t.name, t.description, t.created_at, t.updated_at, mt.percentage
         FROM module_topics mt
         JOIN topics t ON mt.topic_id = t.id
         WHERE mt.module_id = ?`,
        [moduleId]
      );

      return {
        id: moduleId,
        name: input.name,
        description: input.description,
        defaultQuestionCount: input.defaultQuestionCount || 65,
        defaultDurationMinutes: input.defaultDurationMinutes || 130,
        passingScore: input.passingScore,
        topics: topicsData.map((t: any) => ({
          topic: {
            id: t.id,
            name: t.name,
            description: t.description,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          },
          percentage: t.percentage,
        })),
        createdAt: created?.created_at || now,
        updatedAt: created?.updated_at || now,
      };
    } catch (error) {
      logger.error('Failed to create module:', error);
      throw error;
    }
  },

  async generateExam(
    _: any,
    {
      input,
    }: {
      input: {
        userId: string;
        moduleId: string;
        questionCount?: number;
        durationMinutes?: number;
      };
    },
    context: ResolverContext
  ) {
    try {
      const examId = await generateExam(context.db, input);
      logger.success(`Generated exam ${examId}`);

      // Fetch and return the generated exam
      const sql = `
        SELECT exam_id, user_id, module_id, name, status, duration_minutes,
               question_count, created_at, started_at, submitted_at, expires_at, score
        FROM exams
        WHERE exam_id = ?
      `;
      const exam = await queryOne<any>(context.db, sql, [examId]);
      if (!exam) throw new Error('Failed to retrieve generated exam');

      // Return exam (without full format helper for now - simplified response)
      return {
        examId: exam.exam_id,
        userId: exam.user_id,
        moduleId: exam.module_id,
        name: exam.name,
        status: exam.status.toUpperCase(),
        durationMinutes: exam.duration_minutes,
        questionCount: exam.question_count,
        createdAt: exam.created_at,
        startedAt: exam.started_at,
        submittedAt: exam.submitted_at,
        expiresAt: exam.expires_at,
        score: exam.score,
      };
    } catch (error) {
      logger.error('Failed to generate exam:', error);
      throw error;
    }
  },

  async startExam(_: any, { examId }: { examId: string }, context: ResolverContext) {
    try {
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 130 * 60 * 1000).toISOString(); // 130 minutes default

      const sql = `
        UPDATE exams SET status = 'in_progress', started_at = ?, expires_at = ?
        WHERE exam_id = ? AND status IN ('ready', 'draft')
      `;

      await new Promise<void>((resolve, reject) => {
        context.db.run(sql, [now, expiresAt, examId], function (err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Cannot start exam'));
          } else {
            resolve();
          }
        });
      });

      logger.success(`Started exam ${examId}`);

      const fetchSql = `
        SELECT exam_id, user_id, module_id, name, status, duration_minutes,
               question_count, created_at, started_at, submitted_at, expires_at, score
        FROM exams WHERE exam_id = ?
      `;
      const exam = await queryOne<any>(context.db, fetchSql, [examId]);
      return exam;
    } catch (error) {
      logger.error('Failed to start exam:', error);
      throw error;
    }
  },

  async recordAnswer(
    _: any,
    {
      input,
    }: {
      input: {
        examId: string;
        questionId: string;
        selectedOptionIds: string[];
      };
    },
    context: ResolverContext
  ) {
    try {
      // Get correct answers
      const correctSql = 'SELECT id FROM options WHERE question_id = ? AND is_answer = 1';
      const correctOptions = await queryAll<any>(context.db, correctSql, [input.questionId]);
      const correctIds = new Set(correctOptions.map((o) => o.id));
      const selectedSet = new Set(input.selectedOptionIds);

      // Calculate score: 1 if exact match, 0 otherwise
      const isCorrect =
        correctIds.size === selectedSet.size &&
        Array.from(correctIds).every((id) => selectedSet.has(id));
      const score = isCorrect ? 1 : 0;

      const now = new Date().toISOString();
      const answersSql = `
        INSERT INTO exam_answers (exam_id, question_id, selected_option_ids_json, score, answered_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(exam_id, question_id) DO UPDATE SET
          selected_option_ids_json = excluded.selected_option_ids_json,
          score = excluded.score,
          answered_at = excluded.answered_at
      `;

      await new Promise<void>((resolve, reject) => {
        context.db.run(
          answersSql,
          [input.examId, input.questionId, JSON.stringify(input.selectedOptionIds), score, now],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return {
        examId: input.examId,
        questionId: input.questionId,
        selectedOptionIds: input.selectedOptionIds,
        score,
        answeredAt: now,
      };
    } catch (error) {
      logger.error('Failed to record answer:', error);
      throw error;
    }
  },

  async submitExam(_: any, { examId }: { examId: string }, context: ResolverContext) {
    try {
      // Calculate score
      const answersSql = 'SELECT SUM(score) as total_score, COUNT(*) as answer_count FROM exam_answers WHERE exam_id = ?';
      const answers = await queryOne<any>(context.db, answersSql, [examId]);

      const totalScore = answers?.total_score || 0;
      const answerCount = answers?.answer_count || 0;
      const examSql = 'SELECT question_count FROM exams WHERE exam_id = ?';
      const exam = await queryOne<any>(context.db, examSql, [examId]);

      // Calculate percentage
      const percentage = exam ? (totalScore / exam.question_count) * 100 : 0;

      const now = new Date().toISOString();
      const updateSql = 'UPDATE exams SET status = ?, submitted_at = ?, score = ? WHERE exam_id = ?';

      await new Promise<void>((resolve, reject) => {
        context.db.run(updateSql, ['submitted', now, percentage, examId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.success(`Submitted exam ${examId} with score ${percentage.toFixed(2)}%`);

      const fetchSql = `
        SELECT exam_id, user_id, module_id, name, status, duration_minutes,
               question_count, created_at, started_at, submitted_at, expires_at, score
        FROM exams WHERE exam_id = ?
      `;
      const updated = await queryOne<any>(context.db, fetchSql, [examId]);
      return updated;
    } catch (error) {
      logger.error('Failed to submit exam:', error);
      throw error;
    }
  },

  async markQuestionForReview(
    _: any,
    { examId, questionId, marked }: { examId: string; questionId: string; marked: boolean },
    context: ResolverContext
  ) {
    try {
      const sql = 'UPDATE exam_questions SET marked_for_review = ? WHERE exam_id = ? AND question_id = ?';

      await new Promise<void>((resolve, reject) => {
        context.db.run(sql, [marked ? 1 : 0, examId, questionId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return true;
    } catch (error) {
      logger.error('Failed to mark question for review:', error);
      throw error;
    }
  },
};
