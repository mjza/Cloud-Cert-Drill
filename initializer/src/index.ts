import process from 'process';
import { loadParentEnv } from './config/loadParentEnv.js';
import { resolvePaths } from './config/resolvePaths.js';
import { logger } from './utils/logger.js';
import { init } from './commands/init.js';
import { migrate } from './commands/migrate.js';
import { validate } from './commands/validate.js';
import { status } from './commands/status.js';
import { resetDev } from './commands/resetDev.js';

/**
 * CLI entry point for the initializer
 */
async function main() {
  try {
    // Load parent environment
    loadParentEnv();

    // Resolve all paths
    const paths = resolvePaths();

    logger.debug(`Project root: ${paths.projectRoot}`);
    logger.debug(`Database path: ${paths.databasePath}`);
    logger.debug(`Migrations dir: ${paths.migrationsDir}`);

    // Parse command from arguments
    const command = process.argv[2] || 'init';
    const args = process.argv.slice(3);

    switch (command) {
      case 'init':
        await init(paths.databasePath, paths.databaseDir, paths.migrationsDir, {
          seed: args.includes('--seed'),
        });
        break;

      case 'migrate':
        await migrate(paths.databasePath, paths.migrationsDir);
        break;

      case 'seed': {
        const { seed } = await import('./commands/seed.js');
        const { openInitializerConnection, closeDatabase } = await import(
          './db/openInitializerConnection.js'
        );
        const db = await openInitializerConnection({ databasePath: paths.databasePath });
        const seedMode = args[0] || 'dev';
        await seed(db, seedMode as 'dev' | 'minimal' | 'none');
        await closeDatabase(db);
        break;
      }

      case 'validate':
        await validate(paths.databasePath, paths.migrationsDir);
        break;

      case 'status':
        await status(paths.databasePath);
        break;

      case 'reset:dev':
        await resetDev(paths.databasePath, paths.databaseDir, paths.migrationsDir, {
          seed: args.includes('--seed'),
        });
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        console.log(`\nAvailable commands:`);
        console.log(`  init              Create and initialize database`);
        console.log(`  migrate           Apply pending migrations`);
        console.log(`  seed [mode]       Seed data (dev, minimal, none)`);
        console.log(`  validate          Validate database schema`);
        console.log(`  status            Show database status`);
        console.log(`  reset:dev         Reset dev database with backup`);
        process.exit(1);
    }
  } catch (error) {
    logger.error('Fatal error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

main();
