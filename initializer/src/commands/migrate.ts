import sqlite3 from 'sqlite3';
import { openInitializerConnection, closeDatabase } from '../db/openInitializerConnection.js';
import {
  initializeMigrationsTable,
  getPendingMigrations,
  applyMigration,
  verifyMigrationChecksums,
} from '../db/migrationRepository.js';
import { logger } from '../utils/logger.js';

export async function migrate(databasePath: string, migrationsDir: string): Promise<void> {
  logger.section('Running Migrations');

  try {
    const db = await openInitializerConnection({ databasePath });

    // Initialize migrations table if it doesn't exist
    await initializeMigrationsTable(db);

    // Verify existing migrations haven't been tampered with
    await verifyMigrationChecksums(db, migrationsDir);

    // Apply pending migrations
    const pending = await getPendingMigrations(db, migrationsDir);

    if (pending.length === 0) {
      logger.info('No pending migrations');
    } else {
      logger.info(`Found ${pending.length} pending migration(s)`);
      logger.divider();

      for (const migration of pending) {
        await applyMigration(db, migration);
      }

      logger.divider();
      logger.success(`Applied ${pending.length} migration(s)`);
    }

    await closeDatabase(db);
  } catch (error) {
    logger.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
