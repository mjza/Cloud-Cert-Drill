import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

/**
 * Create a backup of the database file
 */
export async function backupDatabase(databasePath: string): Promise<string> {
  if (!fs.existsSync(databasePath)) {
    logger.warn('Database file does not exist, skipping backup');
    return '';
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = `${databasePath}.backup-${timestamp}`;

  try {
    fs.copyFileSync(databasePath, backupPath);
    logger.success(`Database backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    logger.error(`Failed to backup database: ${error}`);
    throw error;
  }
}

/**
 * List all backup files for a database
 */
export function listBackups(databasePath: string): string[] {
  const dir = path.dirname(databasePath);
  const fileName = path.basename(databasePath);
  const pattern = `${fileName}.backup-`;

  try {
    const files = fs.readdirSync(dir);
    return files
      .filter((f) => f.startsWith(pattern))
      .map((f) => path.join(dir, f))
      .sort()
      .reverse();
  } catch (error) {
    logger.warn(`Failed to list backups: ${error}`);
    return [];
  }
}
