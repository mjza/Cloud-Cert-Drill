import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger.js';
import { queryOne, queryAll } from '../db/connection.js';
import { generateId } from '../utils/id.js';
import { mutations } from './mutations.js';

export interface ResolverContext {
  db: sqlite3.Database;
}

export const resolvers = {
  DateTime: {
    parseValue(value: any) {
      return new Date(value);
    },
    serialize(value: Date) {
      return value.toISOString();
    },
  },

  Query: {
    async health(_: any, __: any, context: ResolverContext) {
      try {
        const db = context.db;
        // Simple health check query
        await queryOne(db, 'SELECT 1 as health');

        return {
          status: 'healthy',
          database: 'connected',
          timestamp: new Date(),
        };
      } catch (error) {
        logger.error('Health check failed:', error);
        return {
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: new Date(),
        };
      }
    },

    async users(_: any, __: any, context: ResolverContext) {
      try {
        const sql = 'SELECT user_id, name, created_at, updated_at FROM users ORDER BY name';
        const users = await queryAll<any>(context.db, sql);
        return users.map((u) => ({
          userId: u.user_id,
          name: u.name,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        }));
      } catch (error) {
        logger.error('Failed to fetch users:', error);
        throw error;
      }
    },

    async user(_: any, { userId }: { userId: string }, context: ResolverContext) {
      try {
        const sql = 'SELECT user_id, name, created_at, updated_at FROM users WHERE user_id = ?';
        const user = await queryOne<any>(context.db, sql, [userId]);
        if (!user) return null;
        return {
          userId: user.user_id,
          name: user.name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
      } catch (error) {
        logger.error('Failed to fetch user:', error);
        throw error;
      }
    },

    async userByName(_: any, { name }: { name: string }, context: ResolverContext) {
      try {
        const sql = 'SELECT user_id, name, created_at, updated_at FROM users WHERE LOWER(name) = LOWER(?)';
        const user = await queryOne<any>(context.db, sql, [name.trim()]);
        if (!user) return null;
        return {
          userId: user.user_id,
          name: user.name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        };
      } catch (error) {
        logger.error('Failed to fetch user by name:', error);
        throw error;
      }
    },

    async modules(_: any, __: any, context: ResolverContext) {
      try {
        const sql = `
          SELECT m.id, m.name, m.description, m.default_question_count,
                 m.default_duration_minutes, m.passing_score, m.created_at, m.updated_at
          FROM modules m
          ORDER BY m.name
        `;
        const modules = await queryAll<any>(context.db, sql);
        return Promise.all(modules.map((m) => formatModule(context.db, m)));
      } catch (error) {
        logger.error('Failed to fetch modules:', error);
        throw error;
      }
    },

    async module(_: any, { id }: { id: string }, context: ResolverContext) {
      try {
        const sql = `
          SELECT id, name, description, default_question_count,
                 default_duration_minutes, passing_score, created_at, updated_at
          FROM modules
          WHERE id = ?
        `;
        const module = await queryOne<any>(context.db, sql, [id]);
        if (!module) return null;
        return formatModule(context.db, module);
      } catch (error) {
        logger.error('Failed to fetch module:', error);
        throw error;
      }
    },

    async topics(_: any, __: any, context: ResolverContext) {
      try {
        const sql = 'SELECT id, name, description, created_at, updated_at FROM topics ORDER BY name';
        const topics = await queryAll<any>(context.db, sql);
        return topics.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
      } catch (error) {
        logger.error('Failed to fetch topics:', error);
        throw error;
      }
    },

    async topic(_: any, { id }: { id: string }, context: ResolverContext) {
      try {
        const sql = 'SELECT id, name, description, created_at, updated_at FROM topics WHERE id = ?';
        const topic = await queryOne<any>(context.db, sql, [id]);
        if (!topic) return null;
        return {
          id: topic.id,
          name: topic.name,
          description: topic.description,
          createdAt: topic.created_at,
          updatedAt: topic.updated_at,
        };
      } catch (error) {
        logger.error('Failed to fetch topic:', error);
        throw error;
      }
    },

    async question(_: any, { id }: { id: string }, context: ResolverContext) {
      try {
        return await getQuestionWithOptions(context.db, id);
      } catch (error) {
        logger.error('Failed to fetch question:', error);
        throw error;
      }
    },

    async questions(
      _: any,
      { limit, offset, topicId }: { limit?: number; offset?: number; topicId?: string },
      context: ResolverContext
    ) {
      try {
        let sql = `
          SELECT id, topic_id, text, explanation, duration_seconds, difficulty,
                 lock_orders, is_active, source, created_at, updated_at
          FROM questions
          WHERE is_active = 1
        `;
        const params: any[] = [];

        if (topicId) {
          sql += ' AND topic_id = ?';
          params.push(topicId);
        }

        sql += ' ORDER BY created_at DESC';

        if (limit) {
          sql += ' LIMIT ?';
          params.push(limit);
        }
        if (offset) {
          sql += ' OFFSET ?';
          params.push(offset);
        }

        const questions = await queryAll<any>(context.db, sql, params);
        return Promise.all(questions.map((q) => formatQuestion(context.db, q)));
      } catch (error) {
        logger.error('Failed to fetch questions:', error);
        throw error;
      }
    },

    async exams(_: any, { userId }: { userId: string }, context: ResolverContext) {
      try {
        const sql = `
          SELECT exam_id, user_id, module_id, name, status, duration_minutes,
                 question_count, created_at, started_at, submitted_at, expires_at, score
          FROM exams
          WHERE user_id = ?
          ORDER BY created_at DESC
        `;
        const exams = await queryAll<any>(context.db, sql, [userId]);
        return Promise.all(exams.map((e) => formatExam(context.db, e)));
      } catch (error) {
        logger.error('Failed to fetch exams:', error);
        throw error;
      }
    },

    async exam(_: any, { examId }: { examId: string }, context: ResolverContext) {
      try {
        const sql = `
          SELECT exam_id, user_id, module_id, name, status, duration_minutes,
                 question_count, created_at, started_at, submitted_at, expires_at, score
          FROM exams
          WHERE exam_id = ?
        `;
        const exam = await queryOne<any>(context.db, sql, [examId]);
        if (!exam) return null;
        return formatExam(context.db, exam);
      } catch (error) {
        logger.error('Failed to fetch exam:', error);
        throw error;
      }
    },
  },

  Mutation: {
    async upsertUserByName(_: any, { name }: { name: string }, context: ResolverContext) {
      try {
        const trimmedName = name.trim();
        if (!trimmedName) {
          throw new Error('User name cannot be empty');
        }

        // Check if user exists
        let sql = 'SELECT user_id, name, created_at, updated_at FROM users WHERE LOWER(name) = LOWER(?)';
        let user = await queryOne<any>(context.db, sql, [trimmedName]);

        if (user) {
          return {
            userId: user.user_id,
            name: user.name,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          };
        }

        // Create new user
        const userId = generateId('user');
        const now = new Date().toISOString();
        sql = 'INSERT INTO users (user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)';
        await new Promise<void>((resolve, reject) => {
          context.db.run(sql, [userId, trimmedName, now, now], function (err) {
            if (err) reject(err);
            else resolve();
          });
        });

        return {
          userId,
          name: trimmedName,
          createdAt: now,
          updatedAt: now,
        };
      } catch (error) {
        logger.error('Failed to upsert user:', error);
        throw error;
      }
    },
    ...mutations,
  },
};

/**
 * Helper functions
 */
async function getQuestionWithOptions(db: sqlite3.Database, questionId: string) {
  const sql = `
    SELECT id, topic_id, text, explanation, duration_seconds, difficulty,
           lock_orders, is_active, source, created_at, updated_at
    FROM questions
    WHERE id = ?
  `;
  const question = await queryOne<any>(db, sql, [questionId]);
  if (!question) return null;
  return formatQuestion(db, question);
}

async function formatQuestion(db: sqlite3.Database, q: any) {
  const optionsSql = `
    SELECT id, question_id, is_answer, text, display_order, created_at, updated_at
    FROM options
    WHERE question_id = ?
    ORDER BY display_order
  `;
  const options = await queryAll<any>(db, optionsSql, [q.id]);

  const topicSql = 'SELECT id, name, description, created_at, updated_at FROM topics WHERE id = ?';
  const topic = await queryOne<any>(db, topicSql, [q.topic_id]);

  return {
    id: q.id,
    topicId: q.topic_id,
    topic: topic
      ? {
          id: topic.id,
          name: topic.name,
          description: topic.description,
          createdAt: topic.created_at,
          updatedAt: topic.updated_at,
        }
      : null,
    text: q.text,
    explanation: q.explanation,
    durationSeconds: q.duration_seconds,
    difficulty: q.difficulty?.toUpperCase(),
    lockOrders: q.lock_orders === 1,
    isActive: q.is_active === 1,
    source: q.source,
    options: options.map((o: any) => ({
      id: o.id,
      questionId: o.question_id,
      isAnswer: o.is_answer === 1,
      text: o.text,
      displayOrder: o.display_order,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    })),
    createdAt: q.created_at,
    updatedAt: q.updated_at,
  };
}

async function formatModule(db: sqlite3.Database, m: any) {
  const topicsSql = `
    SELECT t.id, t.name, t.description, t.created_at, t.updated_at, mt.percentage
    FROM module_topics mt
    JOIN topics t ON mt.topic_id = t.id
    WHERE mt.module_id = ?
    ORDER BY t.name
  `;
  const topics = await queryAll<any>(db, topicsSql, [m.id]);

  return {
    id: m.id,
    name: m.name,
    description: m.description,
    defaultQuestionCount: m.default_question_count,
    defaultDurationMinutes: m.default_duration_minutes,
    passingScore: m.passing_score,
    topics: topics.map((t: any) => ({
      topic: {
        id: t.id,
        name: t.name,
        description: t.description,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      },
      percentage: t.percentage,
    })),
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

async function formatExam(db: sqlite3.Database, e: any) {
  const questionsSql = `
    SELECT eq.exam_id, eq.question_id, eq.position, eq.option_order_json, eq.marked_for_review
    FROM exam_questions eq
    WHERE eq.exam_id = ?
    ORDER BY eq.position
  `;
  const questions = await queryAll<any>(db, questionsSql, [e.exam_id]);

  const questionList = await Promise.all(
    questions.map(async (q: any) => {
      const question = await getQuestionWithOptions(db, q.question_id);
      return {
        examId: q.exam_id,
        question,
        position: q.position,
        optionOrder: q.option_order_json ? JSON.parse(q.option_order_json) : null,
        markedForReview: q.marked_for_review === 1,
      };
    })
  );

  const userSql = 'SELECT user_id, name, created_at, updated_at FROM users WHERE user_id = ?';
  const user = await queryOne<any>(db, userSql, [e.user_id]);

  const moduleSql = `
    SELECT id, name, description, default_question_count, default_duration_minutes,
           passing_score, created_at, updated_at FROM modules WHERE id = ?
  `;
  const module = await queryOne<any>(db, moduleSql, [e.module_id]);

  return {
    examId: e.exam_id,
    userId: e.user_id,
    user: user
      ? {
          userId: user.user_id,
          name: user.name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        }
      : null,
    moduleId: e.module_id,
    module: module ? await formatModule(db, module) : null,
    name: e.name,
    status: e.status?.toUpperCase().replace(/_/g, '_'),
    durationMinutes: e.duration_minutes,
    questionCount: e.question_count,
    createdAt: e.created_at,
    startedAt: e.started_at,
    submittedAt: e.submitted_at,
    expiresAt: e.expires_at,
    score: e.score,
    questions: questionList,
  };
}
