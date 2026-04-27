import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import sqlite3 from 'sqlite3';
import { loadParentEnv } from './config/env.js';
import { loadBackendConfig, BackendConfig } from './config/env.js';
import { openRuntimeConnection, checkDatabaseHealth, closeDatabase } from './db/connection.js';
import { logger } from './utils/logger.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers, ResolverContext } from './graphql/resolvers.js';

let db: sqlite3.Database | null = null;
let server: ApolloServer<ResolverContext> | null = null;

async function startServer() {
  try {
    logger.section('Starting Backend Server');

    // Step 1: Load environment configuration
    loadParentEnv();
    const config = loadBackendConfig();
    logger.info(`Environment: ${config.appEnv}`);
    logger.info(`Database: ${config.databasePath}`);
    logger.info(`Backend: http://${config.backendHost}:${config.backendPort}`);

    // Step 2: Connect to database
    db = await openRuntimeConnection({
      databasePath: config.databasePath,
      verbose: config.logLevel === 'debug',
    });
    logger.success('Database connected');

    // Step 3: Health check
    const healthy = await checkDatabaseHealth(db);
    if (!healthy) {
      logger.error('Database health check failed. Run: npm run init:db');
      process.exit(1);
    }

    // Step 4: Create Apollo Server
    server = new ApolloServer<ResolverContext>({
      typeDefs,
      resolvers,
      introspection: config.appEnv === 'development',
      formatError: (error) => {
        logger.error('GraphQL Error:', error.message);
        return {
          message: error.message,
          extensions: error.extensions,
        };
      },
    });

    await server.start();
    logger.success('Apollo Server started');

    // Step 5: Create Express app
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    });

    // GraphQL endpoint
    app.use('/graphql', expressMiddleware(server, {
      context: async () => ({
        db: db!,
      }),
    }));

    // Error handling middleware
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Express Error:', err);
      res.status(500).json({
        error: config.appEnv === 'development' ? err.message : 'Internal Server Error',
      });
    });

    // Step 6: Start listening
    await new Promise<void>((resolve) => {
      app.listen(config.backendPort, config.backendHost, () => {
        logger.section('Server Ready');
        logger.success(`Backend running at http://${config.backendHost}:${config.backendPort}`);
        logger.info(`GraphQL endpoint: http://${config.backendHost}:${config.backendPort}/graphql`);
        logger.info(`Apollo Studio: ${config.appEnv === 'development' ? 'Available in Apollo Studio' : 'Disabled'}`);
        resolve();
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.section(`Received ${signal}, shutting down gracefully`);

  try {
    if (server) {
      await server.stop();
      logger.success('Apollo Server stopped');
    }

    if (db) {
      await closeDatabase(db);
      logger.success('Database disconnected');
    }

    logger.success('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the server
startServer();
