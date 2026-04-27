import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get the project root directory (3 levels up from this file)
 */
function getProjectRoot(): string {
  return path.resolve(__dirname, '../../..');
}

/**
 * Walk up the directory tree to find and load the parent project .env file
 */
export function loadParentEnv(): Record<string, string> {
  let currentDir = getProjectRoot();
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
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  console.warn('⚠️  No .env file found in project root. Using environment variables only.');
  return {};
}

/**
 * Get a config value from environment
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

/**
 * Backend configuration
 */
export interface BackendConfig {
  appEnv: string;
  appName: string;
  databasePath: string;
  backendHost: string;
  backendPort: number;
  logLevel: string;
}

/**
 * Load and validate backend configuration
 */
export function loadBackendConfig(): BackendConfig {
  const projectRoot = getProjectRoot();
  const dbPathConfig = getEnv('DATABASE_PATH', './data/database.sqlite');

  // Resolve database path to absolute path (like the initializer does)
  const databasePath = path.isAbsolute(dbPathConfig)
    ? dbPathConfig
    : path.resolve(projectRoot, dbPathConfig);

  return {
    appEnv: getEnv('APP_ENV', 'development'),
    appName: getEnv('APP_NAME', 'CloudCert Drill'),
    databasePath,
    backendHost: getEnv('BACKEND_HOST', '127.0.0.1'),
    backendPort: parseInt(getEnv('BACKEND_PORT', '4317'), 10),
    logLevel: getEnv('LOG_LEVEL', 'info'),
  };
}
