import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger.js';

export interface DatabaseConfig {
  databasePath: string;
  verbose?: boolean;
}

/**
 * Open a runtime SQLite connection for the backend
 */
export async function openRuntimeConnection(config: DatabaseConfig): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(config.databasePath, (err) => {
      if (err) {
        logger.error(`Failed to open database at ${config.databasePath}:`, err.message);
        reject(err);
        return;
      }

      if (config.verbose) {
        db.on('trace', (sql) => logger.debug('SQL:', sql));
      }

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          logger.error('Failed to enable foreign keys:', err.message);
          reject(err);
          return;
        }

        logger.debug(`Database connection opened: ${config.databasePath}`);
        resolve(db);
      });
    });
  });
}

/**
 * Close a database connection
 */
export async function closeDatabase(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        logger.error('Failed to close database:', err.message);
        reject(err);
        return;
      }
      logger.debug('Database connection closed');
      resolve();
    });
  });
}

/**
 * Run a single SQL statement
 */
export async function runSQL(db: sqlite3.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Execute a SQL query and return all rows
 */
export async function queryAll<T = any>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

/**
 * Execute a SQL query and return first row
 */
export async function queryOne<T = any>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((row as T) || null);
    });
  });
}

/**
 * Run a transaction
 */
export async function transaction<T>(
  db: sqlite3.Database,
  callback: (db: sqlite3.Database) => Promise<T>
): Promise<T> {
  try {
    await runSQL(db, 'BEGIN TRANSACTION');
    const result = await callback(db);
    await runSQL(db, 'COMMIT');
    return result;
  } catch (error) {
    await runSQL(db, 'ROLLBACK').catch(() => {
      /* ignore rollback errors */
    });
    throw error;
  }
}

/**
 * Check database health and schema
 */
export async function checkDatabaseHealth(db: sqlite3.Database): Promise<boolean> {
  try {
    // Verify migrations table exists
    const result = await queryOne<{ name: string }>(
      db,
      `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'`
    );

    if (!result) {
      logger.error('schema_migrations table not found. Run: npm run init:db');
      return false;
    }

    // Verify all required tables exist
    const requiredTables = [
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
    ];

    const tables = await queryAll<{ name: string }>(
      db,
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    const tableNames = new Set(tables.map((t) => t.name));

    const missing = requiredTables.filter((t) => !tableNames.has(t));
    if (missing.length > 0) {
      logger.error(`Missing tables: ${missing.join(', ')}. Run: npm run init:db`);
      return false;
    }

    logger.info('Database health check passed');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error instanceof Error ? error.message : error);
    return false;
  }
}
