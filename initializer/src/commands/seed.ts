import sqlite3 from 'sqlite3';
import { openInitializerConnection, closeDatabase, transaction, runSQL, queryOne } from '../db/openInitializerConnection.js';
import { logger } from '../utils/logger.js';

type SeedMode = 'dev' | 'minimal' | 'none';

export async function seed(db: sqlite3.Database, mode: SeedMode = 'dev'): Promise<void> {
  if (mode === 'none') {
    logger.info('Skipping seed (SEED_MODE=none)');
    return;
  }

  logger.info(`Seeding with mode: ${mode}`);

  await transaction(db, async (txDb) => {
    // Seed minimal required data
    if (mode === 'minimal' || mode === 'dev') {
      await seedMinimalData(txDb);
    }

    // Seed development data
    if (mode === 'dev') {
      await seedDevData(txDb);
    }
  });

  logger.success('Seeding complete');
}

async function seedMinimalData(db: sqlite3.Database): Promise<void> {
  // Seed default topics
  const defaultTopics = [
    { id: 'topic-1', name: 'EC2', description: 'Elastic Compute Cloud' },
    { id: 'topic-2', name: 'S3', description: 'Simple Storage Service' },
    { id: 'topic-3', name: 'RDS', description: 'Relational Database Service' },
    { id: 'topic-4', name: 'VPC', description: 'Virtual Private Cloud' },
    { id: 'topic-5', name: 'IAM', description: 'Identity and Access Management' },
  ];

  for (const topic of defaultTopics) {
    const existing = await queryOne(db, 'SELECT id FROM topics WHERE id = ?', [topic.id]);
    if (!existing) {
      await runSQL(
        db,
        `INSERT INTO topics (id, name, description) VALUES (?, ?, ?)`,
        [topic.id, topic.name, topic.description]
      );
      logger.debug(`Seeded topic: ${topic.name}`);
    }
  }

  // Seed default modules
  const defaultModules = [
    {
      id: 'module-clf-c02',
      name: 'AWS Certified Cloud Practitioner (CLF-C02)',
      description: 'Cloud Practitioner certification exam',
      defaultQuestionCount: 60,
      defaultDurationMinutes: 90,
      passingScore: 70,
    },
    {
      id: 'module-saa-c03',
      name: 'AWS Solutions Architect Associate (SAA-C03)',
      description: 'Solutions Architect Associate certification exam',
      defaultQuestionCount: 65,
      defaultDurationMinutes: 130,
      passingScore: 72,
    },
  ];

  for (const module of defaultModules) {
    const existing = await queryOne(db, 'SELECT id FROM modules WHERE id = ?', [module.id]);
    if (!existing) {
      await runSQL(
        db,
        `INSERT INTO modules (id, name, description, default_question_count, default_duration_minutes, passing_score)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          module.id,
          module.name,
          module.description,
          module.defaultQuestionCount,
          module.defaultDurationMinutes,
          module.passingScore,
        ]
      );
      logger.debug(`Seeded module: ${module.name}`);
    }
  }

  // Seed module-topic relationships
  const moduleTopic = [
    { moduleId: 'module-clf-c02', topicId: 'topic-1', percentage: 20 },
    { moduleId: 'module-clf-c02', topicId: 'topic-2', percentage: 25 },
    { moduleId: 'module-clf-c02', topicId: 'topic-3', percentage: 20 },
    { moduleId: 'module-clf-c02', topicId: 'topic-4', percentage: 20 },
    { moduleId: 'module-clf-c02', topicId: 'topic-5', percentage: 15 },
    { moduleId: 'module-saa-c03', topicId: 'topic-1', percentage: 25 },
    { moduleId: 'module-saa-c03', topicId: 'topic-2', percentage: 25 },
    { moduleId: 'module-saa-c03', topicId: 'topic-3', percentage: 20 },
    { moduleId: 'module-saa-c03', topicId: 'topic-4', percentage: 20 },
    { moduleId: 'module-saa-c03', topicId: 'topic-5', percentage: 10 },
  ];

  for (const rel of moduleTopic) {
    const existing = await queryOne(
      db,
      'SELECT * FROM module_topics WHERE module_id = ? AND topic_id = ?',
      [rel.moduleId, rel.topicId]
    );
    if (!existing) {
      await runSQL(
        db,
        `INSERT INTO module_topics (module_id, topic_id, percentage) VALUES (?, ?, ?)`,
        [rel.moduleId, rel.topicId, rel.percentage]
      );
    }
  }

  logger.success('Minimal data seeded');
}

async function seedDevData(db: sqlite3.Database): Promise<void> {
  // Seed sample users
  const sampleUsers = [
    { userId: 'user-1', name: 'Alice' },
    { userId: 'user-2', name: 'Bob' },
    { userId: 'user-3', name: 'Charlie' },
  ];

  for (const user of sampleUsers) {
    const existing = await queryOne(db, 'SELECT user_id FROM users WHERE user_id = ?', [user.userId]);
    if (!existing) {
      await runSQL(db, `INSERT INTO users (user_id, name) VALUES (?, ?)`, [user.userId, user.name]);
      logger.debug(`Seeded user: ${user.name}`);
    }
  }

  // Seed sample questions
  const sampleQuestions = [
    {
      id: 'q-1',
      topicId: 'topic-1',
      text: 'What does EC2 stand for?',
      explanation: 'EC2 stands for Elastic Compute Cloud, AWS service for computing resources.',
      durationSeconds: 45,
      difficulty: 'easy',
    },
    {
      id: 'q-2',
      topicId: 'topic-2',
      text: 'What is the maximum object size in S3?',
      explanation: 'The maximum object size in S3 is 5 TB.',
      durationSeconds: 30,
      difficulty: 'medium',
    },
  ];

  for (const question of sampleQuestions) {
    const existing = await queryOne(db, 'SELECT id FROM questions WHERE id = ?', [question.id]);
    if (!existing) {
      await runSQL(
        db,
        `INSERT INTO questions (id, topic_id, text, explanation, duration_seconds, difficulty)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          question.id,
          question.topicId,
          question.text,
          question.explanation,
          question.durationSeconds,
          question.difficulty,
        ]
      );
      logger.debug(`Seeded question: ${question.text}`);
    }
  }

  logger.success('Development data seeded');
}
