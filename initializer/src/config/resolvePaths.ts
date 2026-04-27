import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getEnv } from './loadParentEnv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ResolvedPaths {
  projectRoot: string;
  databasePath: string;
  databaseDir: string;
  migrationsDir: string;
  seedsDir: string;
}

/**
 * Resolve all required paths from config and environment
 */
export function resolvePaths(): ResolvedPaths {
  // Project root is three levels up from this file
  const projectRoot = path.resolve(__dirname, '../../..');

  // Get database path from environment (defaults to ./data/database.sqlite relative to project root)
  const dbPathConfig = getEnv('DATABASE_PATH', './data/database.sqlite');

  // Resolve to absolute path
  const databasePath = path.isAbsolute(dbPathConfig)
    ? dbPathConfig
    : path.resolve(projectRoot, dbPathConfig);

  const databaseDir = path.dirname(databasePath);

  // Migrations are in the initializer src directory
  const migrationsDir = path.resolve(__dirname, '../migrations');

  // Seeds are in the initializer src directory
  const seedsDir = path.resolve(__dirname, '../seeds');

  return {
    projectRoot,
    databasePath,
    databaseDir,
    migrationsDir,
    seedsDir,
  };
}
