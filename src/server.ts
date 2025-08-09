import express, { Express, Request, Response, NextFunction } from 'express';
import DreamAnalyzerBot from './bot';

interface BotStatus {
  botActive: boolean;
}

export default class Server {
  private app: Express;
  private port: number;
  private bot: DreamAnalyzerBot | null;

  constructor() {
    this.app = express();
    this.port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    this.bot = null;

    this.setupExpress();
    this.setupRoutes();
  }

  // Configure Express middlewares and webhook route
  private setupExpress(): void {
    // Middleware for parsing JSON
    this.app.use(express.json());

    // Middleware for logging requests
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[Express log] ${new Date().toISOString()} - req.method: ${req.method} req.path: ${req.path}`);
      next();
    });

    // Error handling middleware
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Express error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Webhook route
    this.app.use(`/webhook/${process.env.BOT_TOKEN}`, (req: Request, res: Response) => {
      // Pass the update to the bot for processing
      this.bot?.getBot().handleUpdate(req.body);
      res.sendStatus(200);
    });
  }

  // Configure other routes
  private setupRoutes(): void {
    // Health endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        service: 'Dream Analyzer Bot',
        status: 'running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      });
    });

    // Check bot status
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const botStatus: BotStatus = this.bot
          ? { botActive: true }
          : { botActive: false };

        res.json({
          server: 'healthy',
          bot: botStatus,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
          server: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Statistics endpoint (optional)
    this.app.get('/stats', async (req: Request, res: Response) => {
      try {
        res.json({
          message: 'Statistics endpoint',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Error getting statistics' });
      }
    });

    // 404 for unknown routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // Start the server and bot
  public async start(): Promise<void> {
    try {
      // Instantiate the bot
      this.bot = new DreamAnalyzerBot();

      // Determine whether to use webhook or polling
      if (process.env.WEBHOOK_URL) {
        console.log('Starting in webhook mode...');
        // Configure webhook
        const webhookPath = await this.bot.setupWebhook();
        console.log(`Webhook configured at: ${webhookPath}`);
        // Start HTTP server to handle webhook
        this.app.listen(this.port, () => {
          console.log(`Server running on port ${this.port}`);
          console.log(`Webhook URL: ${process.env.WEBHOOK_URL}${webhookPath}`);
        });
      } else {
        console.log('Starting in polling mode...');
        // Start HTTP server for health checks
        this.app.listen(this.port, () => {
          console.log(`Health check server running on port ${this.port}`);
        });
        // Start bot in polling mode
        await this.bot.startPolling();
      }
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  }

  // Stop the server and bot
  public async stop(): Promise<void> {
    try {
      console.log('Stopping server...');
      if (this.bot) {
        await this.bot.stop('SIGTERM');
      }
      console.log('Server stopped');
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  }
}