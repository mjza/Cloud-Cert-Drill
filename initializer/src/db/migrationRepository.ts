import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { queryAll, queryOne, runSQL, transaction } from './openInitializerConnection.js';
import { logger } from '../utils/logger.js';

export interface Migration {
  version: string;
  name: string;
  checksum: string;
  appliedAt: string;
}

export interface MigrationFile {
  version: string;
  name: string;
  path: string;
  checksum: string;
}

/**
 * Initialize schema migrations tracking table
 */
export async function initializeMigrationsTable(db: sqlite3.Database): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await runSQL(db, sql);
  logger.debug('Schema migrations table initialized');
}

/**
 * Get all applied migrations from database
 */
export async function getAppliedMigrations(db: sqlite3.Database): Promise<Migration[]> {
  const sql = 'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC';
  return queryAll<Migration>(db, sql);
}

/**
 * Get the latest applied migration version
 */
export async function getLatestMigrationVersion(db: sqlite3.Database): Promise<string | null> {
  const sql = 'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1';
  const row = await queryOne<{ version: string }>(db, sql);
  return row?.version || null;
}

/**
 * Load all migration files from the migrations directory
 */
export async function loadMigrationFiles(migrationsDir: string): Promise<MigrationFile[]> {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

  const migrations = files
    .map((file) => {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      // Parse version and name from filename: 001_initial_schema.sql
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        logger.warn(`Skipping migration file with invalid name: ${file}`);
        return null;
      }

      const [, version, name] = match;
      return {
        version,
        name,
        path: filePath,
        checksum,
      };
    })
    .filter((m) => m !== null) as MigrationFile[];

  return migrations.sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Get pending migrations (files not yet applied)
 */
export async function getPendingMigrations(
  db: sqlite3.Database,
  migrationsDir: string
): Promise<MigrationFile[]> {
  const appliedVersions = new Set((await getAppliedMigrations(db)).map((m) => m.version));
  const allFiles = await loadMigrationFiles(migrationsDir);
  return allFiles.filter((m) => !appliedVersions.has(m.version));
}

/**
 * Apply a single migration
 */
export async function applyMigration(db: sqlite3.Database, migration: MigrationFile): Promise<void> {
  await transaction(db, async (txDb) => {
    const content = fs.readFileSync(migration.path, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = content
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sql of statements) {
      await runSQL(txDb, sql);
    }

    // Record the migration
    const recordSql = `
      INSERT INTO schema_migrations (version, name, checksum)
      VALUES (?, ?, ?)
    `;
    await new Promise<void>((resolve, reject) => {
      txDb.run(recordSql, [migration.version, migration.name, migration.checksum], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    logger.success(`Applied migration ${migration.version}: ${migration.name}`);
  });
}

/**
 * Verify migration checksums haven't changed
 */
export async function verifyMigrationChecksums(db: sqlite3.Database, migrationsDir: string): Promise<void> {
  const applied = await getAppliedMigrations(db);
  const files = await loadMigrationFiles(migrationsDir);
  const fileMap = new Map(files.map((f) => [f.version, f]));

  for (const migration of applied) {
    const file = fileMap.get(migration.version);
    if (!file) {
      logger.warn(`Applied migration ${migration.version} not found in migrations directory`);
      continue;
    }

    if (file.checksum !== migration.checksum) {
      throw new Error(
        `Migration checksum mismatch for ${migration.version}: ` +
          `expected ${file.checksum}, got ${migration.checksum}. ` +
          `Never edit an already applied migration.`
      );
    }
  }

  logger.success('All migration checksums verified');
}
