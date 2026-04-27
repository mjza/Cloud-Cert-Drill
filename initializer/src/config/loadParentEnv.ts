import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Walk up the directory tree to find and load the parent project .env file
 */
export function loadParentEnv(): Record<string, string> {
  let currentDir = path.resolve(__dirname, '../../..');
  const maxDepth = 10;
  let depth = 0;

  while (depth < maxDepth) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });
      return result.parsed || {};
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  console.warn('⚠️  No .env file found in project root. Using environment variables only.');
  return {};
}

/**
 * Get a config value from environment or parsed .env
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Environment variable ${key} is not set`);
}
