import fs from 'fs';
import sqlite3 from 'sqlite3';
import { openInitializerConnection, closeDatabase } from '../db/openInitializerConnection.js';
import { backupDatabase } from '../utils/backupDatabase.js';
import { logger } from '../utils/logger.js';
import { init } from './init.js';

export interface ResetDevOptions {
  seed?: boolean;
}

export async function resetDev(
  databasePath: string,
  databaseDir: string,
  migrationsDir: string,
  options: ResetDevOptions = {}
): Promise<void> {
  logger.section('Resetting Development Database');
  logger.warn('This will delete and rebuild the local development database');

  try {
    // Step 1: Backup if it exists
    if (fs.existsSync(databasePath)) {
      await backupDatabase(databasePath);
      fs.unlinkSync(databasePath);
      logger.success('Deleted old database file');
    }

    // Step 2: Reinitialize
    await init(databasePath, databaseDir, migrationsDir, {
      seed: options.seed !== false, // default to seeding
    });

    logger.section('Reset Complete');
    logger.success('Development database rebuilt');
  } catch (error) {
    logger.error('Reset failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
