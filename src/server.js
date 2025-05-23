const express = require('express');
const DreamAnalyzerBot = require('./bot');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.bot = null;
    
    this.setupExpress();
    this.setupRoutes();
  }

  // Настройка Express
  setupExpress() {
    // Middleware для парсинга JSON
    this.app.use(express.json());
    
    // Middleware для логирования запросов
    this.app.use((req, res, next) => {
      console.log(`[Express log] ${new Date().toISOString()} - req.method: ${req.method} req.path: ${req.path}`);
      next();
    });

    // Обработка ошибок
    this.app.use((err, req, res, next) => {
      console.error('Express error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  // Настройка маршрутов
  setupRoutes() {
    // Главная страница
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Dream Analyzer Bot',
        status: 'running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Проверка состояния
    this.app.get('/health', async (req, res) => {
      try {
        const botStatus = this.bot ? await this.bot.getStatus() : { botActive: false };
        
        res.json({
          server: 'healthy',
          bot: botStatus,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
          server: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Маршрут для получения статистики (опционально)
    this.app.get('/stats', async (req, res) => {
      try {
        // Здесь можно добавить сбор статистики
        res.json({
          message: 'Statistics endpoint',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Error getting statistics' });
      }
    });

    // 404 для неизвестных маршрутов
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Запуск сервера с ботом
  async start() {
    try {
      // Создаем экземпляр бота
      this.bot = new DreamAnalyzerBot();
      
      // Проверяем, нужно ли использовать webhook
      if (process.env.WEBHOOK_URL) {
        console.log('Starting in webhook mode...');
        
        // Настраиваем webhook
        const webhookPath = this.bot.setupWebhook(this.app);
        console.log(`Webhook configured at: ${webhookPath}`);
        
        // Запускаем сервер
        this.app.listen(this.port, () => {
          console.log(`Server running on port ${this.port}`);
          console.log(`Webhook URL: ${process.env.WEBHOOK_URL}${webhookPath}`);
        });
        
      } else {
        console.log('Starting in polling mode...');
        
        // Запускаем сервер для health checks
        this.app.listen(this.port, () => {
          console.log(`Health check server running on port ${this.port}`);
        });
        
        // Запускаем бота в режиме polling
        await this.bot.startPolling();
      }
      
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  }

  // Остановка сервера
  async stop() {
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

module.exports = Server;
