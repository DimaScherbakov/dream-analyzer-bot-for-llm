import {Context as TelegrafContext, session, Telegraf} from 'telegraf';
import {Express} from 'express';
import SessionManager from './session_manager';
import GeminiAPI from './gemini_api';
import BotHandlers from "./bot_handlers";
import logProcessTimeMiddleware from "./middlewares/log-process-time.middleware";
import checkChatTypeMiddleware from "./middlewares/check-chat-type.middleware";

export default class DreamAnalyzerBot {
  private bot!: Telegraf<TelegrafContext>;
  private sessionManager!: SessionManager;
  private geminiAPI!: GeminiAPI;
  private handlers!: BotHandlers;
  
  constructor() {
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
      this.bot.use(session());
    // Логирование входящих сообщений
    this.bot.use(logProcessTimeMiddleware);

    // Middleware для проверки типа чата (только приватные сообщения)
    this.bot.use(checkChatTypeMiddleware);
  }

  // Настройка обработчиков команд и событий
  setupHandlers() {
    // Команда /start
    this.bot.command('start', (ctx: TelegrafContext) => this.handlers.handleStart(ctx));
    
    // Команда /help
    this.bot.command('help', (ctx: TelegrafContext) => this.handlers.handleHelp(ctx));

    // Обработчик выбора сонника
    this.bot.action(/^interpreter_(.+)$/, (ctx: TelegrafContext) => this.handlers.handleInterpreterChoice(ctx));
    
    // Обработчик перезапуска анализа
    this.bot.action('restart_analysis', (ctx: TelegrafContext) => this.handlers.handleRestartAnalysis(ctx));

    // Обработчик текстовых сообщений
    this.bot.on('text', (ctx: TelegrafContext) => this.handlers.handleTextMessage(ctx));

    // Обработчик неизвестных команд
    this.bot.on('message', (ctx: TelegrafContext) => this.handlers.handleUnknownCommand(ctx));

    // Обработка ошибок
    this.bot.catch((err: unknown, ctx: TelegrafContext) => {
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
  async setupWebhook() {
    try {
      if (!process.env.WEBHOOK_URL) {
        throw new Error('WEBHOOK_URL не найден в переменных окружения');
      }

      const port = 443; // port defined by ngrok (look at devtools)
      const webhookPath = `/webhook/${process.env.BOT_TOKEN}`;
      
      await this.bot.launch({
        webhook: {
          domain: process.env.WEBHOOK_URL,
          port: port,
          path: webhookPath
        },
      });
      
      console.log(`Webhook успешно запущен на порту ${port}`);
      return webhookPath;
    } catch (error) {
      console.error('Ошибка при настройке webhook:', error);
      throw error;
    }
  }

  // Остановка бота
  async stop(signal: string) {
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
    } catch (error: unknown) {
      console.error('Error getting bot status:', error);
      return {
        botActive: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

