import fs from 'fs';
import sqlite3 from 'sqlite3';
import { openInitializerConnection, closeDatabase } from '../db/openInitializerConnection.js';
import {
  initializeMigrationsTable,
  getPendingMigrations,
  applyMigration,
  verifyMigrationChecksums,
} from '../db/migrationRepository.js';
import { logger } from '../utils/logger.js';
import { getEnv } from '../config/loadParentEnv.js';

export interface InitOptions {
  seed?: boolean;
}

export async function init(
  databasePath: string,
  databaseDir: string,
  migrationsDir: string,
  options: InitOptions = {}
): Promise<void> {
  logger.section('Initializing Database');
  logger.info(`Database path: ${databasePath}`);
  logger.info(`Migrations directory: ${migrationsDir}`);

  try {
    // Step 1: Create database directory if needed
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true });
      logger.success(`Created database directory: ${databaseDir}`);
    }

    // Step 2: Open database connection
    const db = await openInitializerConnection({ databasePath });
    logger.success('Database connection established');

    // Step 3: Initialize migrations table
    await initializeMigrationsTable(db);
    logger.success('Migrations table ready');

    // Step 4: Verify existing migration checksums
    await verifyMigrationChecksums(db, migrationsDir);

    // Step 5: Apply pending migrations
    const pending = await getPendingMigrations(db, migrationsDir);
    if (pending.length === 0) {
      logger.info('No pending migrations');
    } else {
      logger.info(`Found ${pending.length} pending migration(s)`);
      for (const migration of pending) {
        await applyMigration(db, migration);
      }
    }

    // Step 6: Seed data if requested
    if (options.seed || getEnv('SEED_ON_INIT', 'false') === 'true') {
      logger.section('Seeding Data');
      const seedModule = await import('./seed.js');
      const seedMode = getEnv('SEED_MODE', 'dev');
      await seedModule.seed(db, seedMode);
    }

    await closeDatabase(db);
    logger.section('Initialization Complete');
    logger.success('Database is ready for use');
  } catch (error) {
    logger.error('Initialization failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
