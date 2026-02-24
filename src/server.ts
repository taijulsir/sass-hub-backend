import { createApp } from './app';
import { env, validateEnv } from './config/env';
import { connectDatabase } from './config/db';
import { logger } from './config/logger';

// Initialize email worker
import './modules/mail/mail.worker';

async function bootstrap(): Promise<void> {
  try {
    // Validate environment variables
    validateEnv();
    
    // Connect to database
    await connectDatabase();
    
    // Create app
    const app = createApp();
    
    // Start server
    app.listen(env.port, () => {
      logger.info(`🚀 Server is running on port ${env.port}`);
      logger.info(`📍 Environment: ${env.nodeEnv}`);
      logger.info(`📚 API Documentation: http://localhost:${env.port}/api/health`);
    });
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
bootstrap();
