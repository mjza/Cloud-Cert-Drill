import sqlite3 from 'sqlite3';
import { openInitializerConnection, closeDatabase, queryAll } from '../db/openInitializerConnection.js';
import {
  getAppliedMigrations,
  verifyMigrationChecksums,
  loadMigrationFiles,
} from '../db/migrationRepository.js';
import { logger } from '../utils/logger.js';

const REQUIRED_TABLES = [
  'topics',
  'modules',
  'module_topics',
  'questions',
  'options',
  'users',
  'exams',
  'exam_questions',
  'exam_answers',
  'statistics',
  'question_drafts',
  'schema_migrations',
];

const REQUIRED_INDEXES = [
  'idx_questions_topic',
  'idx_options_question',
  'idx_exams_user',
  'idx_exams_module',
  'idx_statistics_user_question',
  'idx_exam_answers_exam',
];

export async function validate(databasePath: string, migrationsDir: string): Promise<void> {
  logger.section('Validating Database');

  try {
    const db = await openInitializerConnection({ databasePath });

    // Check migrations
    await verifyMigrationChecksums(db, migrationsDir);
    const applied = await getAppliedMigrations(db);
    const available = await loadMigrationFiles(migrationsDir);

    logger.info(`Migrations: ${applied.length}/${available.length} applied`);
    if (applied.length < available.length) {
      logger.warn(`Pending migrations: ${available.length - applied.length}`);
    }

    // Check required tables
    logger.divider();
    await validateTables(db);

    // Check required indexes
    logger.divider();
    await validateIndexes(db);

    await closeDatabase(db);
    logger.section('Validation Complete');
    logger.success('Database is valid and ready');
  } catch (error) {
    logger.error('Validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function validateTables(db: sqlite3.Database): Promise<void> {
  const tables = await queryAll<{ name: string }>(db, `SELECT name FROM sqlite_master WHERE type='table'`);
  const tableNames = new Set(tables.map((t) => t.name));

  logger.info(`Found ${tables.length} tables`);

  let missing = 0;
  for (const table of REQUIRED_TABLES) {
    if (tableNames.has(table)) {
      logger.debug(`✓ ${table}`);
    } else {
      logger.warn(`✗ Missing table: ${table}`);
      missing++;
    }
  }

  if (missing > 0) {
    throw new Error(`${missing} required table(s) missing`);
  }

  logger.success(`All ${REQUIRED_TABLES.length} required tables present`);
}

async function validateIndexes(db: sqlite3.Database): Promise<void> {
  const indexes = await queryAll<{ name: string }>(
    db,
    `SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`
  );
  const indexNames = new Set(indexes.map((i) => i.name));

  logger.info(`Found ${indexes.length} user-defined indexes`);

  let missing = 0;
  for (const index of REQUIRED_INDEXES) {
    if (indexNames.has(index)) {
      logger.debug(`✓ ${index}`);
    } else {
      logger.warn(`✗ Missing index: ${index}`);
      missing++;
    }
  }

  if (missing > 0) {
    logger.warn(`${missing} recommended index(es) missing`);
  } else {
    logger.success(`All ${REQUIRED_INDEXES.length} recommended indexes present`);
  }
}
