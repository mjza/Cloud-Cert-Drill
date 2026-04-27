import sqlite3 from 'sqlite3';
import fs from 'fs';
import { openInitializerConnection, closeDatabase, queryAll } from '../db/openInitializerConnection.js';
import { getAppliedMigrations, getLatestMigrationVersion } from '../db/migrationRepository.js';
import { logger } from '../utils/logger.js';

export async function status(databasePath: string): Promise<void> {
  logger.section('Database Status');

  try {
    logger.info(`Database path: ${databasePath}`);
    logger.info(`Database exists: ${fs.existsSync(databasePath) ? 'Yes' : 'No'}`);

    if (!fs.existsSync(databasePath)) {
      logger.warn('Database file does not exist');
      return;
    }

    const db = await openInitializerConnection({ databasePath });

    // Check migrations
    const applied = await getAppliedMigrations(db);
    const latest = await getLatestMigrationVersion(db);

    logger.divider();
    logger.info(`Migrations applied: ${applied.length}`);
    if (latest) {
      logger.info(`Latest migration: ${latest}`);
    }

    if (applied.length > 0) {
      logger.divider();
      logger.info('Applied migrations:');
      for (const m of applied.slice(-5)) {
        logger.info(`  ${m.version}: ${m.name} (${new Date(m.appliedAt).toLocaleString()})`);
      }
      if (applied.length > 5) {
        logger.info(`  ... and ${applied.length - 5} more`);
      }
    }

    // Check tables
    const tables = await queryAll<{ name: string }>(
      db,
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );

    logger.divider();
    logger.info(`Tables: ${tables.length}`);
    tables.forEach((t) => {
      logger.info(`  - ${t.name}`);
    });

    // Check indexes
    const indexes = await queryAll<{ name: string }>(
      db,
      `SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`
    );

    logger.divider();
    logger.info(`User-defined indexes: ${indexes.length}`);

    await closeDatabase(db);
  } catch (error) {
    logger.error('Status check failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
