// Load environment variables from .env file if present
import 'dotenv/config';
import Server from './server';

// Check for required environment variables
function checkEnvironmentVariables(): void {
  const requiredVars = ['BOT_TOKEN', 'GEMINI_API_KEY'];
  const missingVars: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.error('❌ Required environment variables missing:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nCreate a .env file based on .env.example and fill in the necessary values.');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
}

// Set up graceful shutdown handlers
function setupGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n📤 Received signal ${signal}. Shutting down...`);

    try {
      await server.stop();
      console.log('✅ Server stopped gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error while stopping server:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('❌ Unhandled exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('❌ Unhandled promise rejection:', reason);
    console.error('Promise:', promise);
    process.exit(1);
  });
}

// Main entry point
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting Dream Analyzer Bot...\n');

    // Ensure environment variables are present
    checkEnvironmentVariables();

    // Display configuration information
    console.log('📋 Configuration:');
    console.log(`   - Mode: ${process.env.WEBHOOK_URL ? 'Webhook' : 'Polling'}`);
    console.log(`   - Port: ${process.env.PORT || 3000}`);
    console.log(`   - Redis: ${process.env.REDIS_URL ? 'Enabled' : 'Disabled (using in-memory storage)'}`);
    if (process.env.WEBHOOK_URL) {
      console.log(`   - Webhook URL: ${process.env.WEBHOOK_URL}`);
    }
    console.log('');

    // Create and start the server
    const server = new Server();

    // Set up graceful shutdown
    setupGracefulShutdown(server);

    // Start the server
    await server.start();

    console.log('🎉 Dream Analyzer Bot launched successfully!\n');

  } catch (error) {
    console.error('❌ Error during startup:', error);
    process.exit(1);
  }
}

// If this module is run directly, start the application
if (require.main === module) {
  main();
}

export { main };