const { Telegraf } = require('telegraf');
const SessionManager = require('./session_manager');
const GeminiAPI = require('./gemini_api');
const BotHandlers = require('./bot_handlers');

class DreamAnalyzerBot {
  constructor() {
    this.bot = null;
    this.sessionManager = null;
    this.geminiAPI = null;
    this.handlers = null;
    
    this.initialize();
  }

  // Инициализация бота и его компонентов
  async initialize() {
    try {
      // Проверяем наличие токена бота
      if (!process.env.BOT_TOKEN) {
        throw new Error('BOT_TOKEN не найден в переменных окружения');
      }

      // Создаем экземпляры сервисов
      this.sessionManager = new SessionManager();
      this.geminiAPI = new GeminiAPI();
      this.handlers = new BotHandlers(this.sessionManager, this.geminiAPI);

      // Создаем бота
      this.bot = new Telegraf(process.env.BOT_TOKEN);

      // Настраиваем middleware
      this.setupMiddleware();

      // Настраиваем обработчики
      this.setupHandlers();

      console.log('Bot initialized successfully');
      
    } catch (error) {
      console.error('Error initializing bot:', error);
      process.exit(1);
    }
  }

  // Настройка middleware
  setupMiddleware() {
    // Логирование входящих сообщений
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      const userId = ctx.from?.id;
      const messageType = ctx.updateType;
      
      console.log(`[Bot log ${new Date().toISOString()}] User ${userId} - ${messageType}`);
      
      try {
        await next();
      } catch (error) {
        console.error(`Error processing update for user ${userId}:`, error);
        
        // Отправляем пользователю сообщение об ошибке
        try {
          await ctx.reply('Произошла внутренняя ошибка. Попробуйте позже или начните заново с /start');
        } catch (replyError) {
          console.error('Error sending error message:', replyError);
        }
      }
      
      const ms = Date.now() - start;
      console.log(`Processed in ${ms}ms`);
    });

    // Middleware для проверки типа чата (только приватные сообщения)
    this.bot.use(async (ctx, next) => {
      if (ctx.chat && ctx.chat.type !== 'private') {
        await ctx.reply('Этот бот работает только в приватных сообщениях.');
        return;
      }
      await next();
    });
  }

  // Настройка обработчиков команд и событий
  setupHandlers() {
    // Команда /start
    this.bot.command('start', (ctx) => this.handlers.handleStart(ctx));
    
    // Команда /help
    this.bot.command('help', (ctx) => this.handlers.handleHelp(ctx));

    // Обработчик выбора сонника
    this.bot.action(/^interpreter_(.+)$/, (ctx) => this.handlers.handleInterpreterChoice(ctx));
    
    // Обработчик перезапуска анализа
    this.bot.action('restart_analysis', (ctx) => this.handlers.handleRestartAnalysis(ctx));

    // Обработчик текстовых сообщений
    this.bot.on('text', (ctx) => this.handlers.handleTextMessage(ctx));

    // Обработчик неизвестных команд
    this.bot.on('message', (ctx) => this.handlers.handleUnknownCommand(ctx));

    // Обработка ошибок
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
      console.error('Update:', ctx.update);
      
      // Пытаемся уведомить пользователя об ошибке
      try {
        ctx.reply('Произошла ошибка при обработке вашего запроса. Попробуйте начать заново с /start');
      } catch (replyError) {
        console.error('Error sending error notification:', replyError);
      }
    });
  }

  // Запуск бота в режиме polling
  async startPolling() {
    try {
      console.log('Starting bot in polling mode...');
      
      // Проверяем работоспособность Gemini API
      const apiHealthy = await this.geminiAPI.checkAPIHealth();
      if (!apiHealthy) {
        console.warn('Warning: Gemini API health check failed. Bot may not work properly.');
      }

      await this.bot.launch();
      console.log('Bot started successfully in polling mode');
      
      // Graceful shutdown
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));
      
    } catch (error) {
      console.error('Error starting bot:', error);
      process.exit(1);
    }
  }

  // Настройка webhook
  setupWebhook(app) {
    const webhookPath = '/webhook';
    const webhookUrl = process.env.WEBHOOK_URL + webhookPath;
    
    // Устанавливаем webhook
    this.bot.telegram.setWebhook(webhookUrl).then(() => {
      console.log(`Webhook set to: ${webhookUrl}`);
    }).catch((error) => {
      console.error('Error setting webhook:', error);
    });

    // Настраиваем маршрут для webhook
    app.use(this.bot.webhookCallback(webhookPath));
    
    return webhookPath;
  }

  // Остановка бота
  async stop(signal) {
    console.log(`Received ${signal}. Stopping bot...`);
    
    try {
      // Останавливаем бота
      this.bot.stop(signal);
      
      // Закрываем соединение с Redis
      if (this.sessionManager) {
        await this.sessionManager.close();
      }
      
      console.log('Bot stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error stopping bot:', error);
      process.exit(1);
    }
  }

  // Получить экземпляр бота
  getBot() {
    return this.bot;
  }

  // Получить экземпляр менеджера сессий
  getSessionManager() {
    return this.sessionManager;
  }

  // Получить экземпляр Gemini API
  getGeminiAPI() {
    return this.geminiAPI;
  }

  // Проверка состояния бота
  async getStatus() {
    try {
      const botInfo = await this.bot.telegram.getMe();
      const apiHealthy = await this.geminiAPI.checkAPIHealth();
      
      return {
        botActive: true,
        botUsername: botInfo.username,
        botId: botInfo.id,
        apiHealthy: apiHealthy,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting bot status:', error);
      return {
        botActive: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = DreamAnalyzerBot;
