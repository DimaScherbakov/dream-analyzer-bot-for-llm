import {Markup} from 'telegraf';
import {CLARIFYING_QUESTIONS, DREAM_INTERPRETERS, USER_STATES} from './constants';
import SessionManager from "./session_manager";
import GeminiAPI from "./gemini_api";
import {Context} from "./types/context.interface";
import {Session} from "./types/session.interface";
import {Interpreter, PromptData} from "./types/prompt-data.interface";
import {TextFormatter} from "./TextFormatter";
import {readFile} from "node:fs/promises";
import sceneManager from "./services/scene-manager";
import {Logger} from "./logger";

export default class BotHandlers {
  private sessionManager: SessionManager;
  private geminiAPI: GeminiAPI;
  private startButton = Markup.inlineKeyboard([
      Markup.button.callback('🚀 Старт', 'start')
  ]);

  constructor(sessionManager: SessionManager, geminiAPI: GeminiAPI) {
    this.sessionManager = sessionManager;
    this.geminiAPI = geminiAPI;
  }

  // Обработчик команды /start
  async handleStart(ctx: Context): Promise<void> {
    try {
        sceneManager.handleInput(ctx);
        await sceneManager.deleteAll(ctx);
        ctx.deleteMessage && await ctx.deleteMessage();
        const userId = ctx.from?.id;
        await this.#greeting(ctx);

        if(!(await this.#hasAIPermission(userId))) {
            return await sceneManager.replyAndStore(ctx, 'Попробуйте через 24 часа, лимит запросов на сегодня исчерпан.', this.startButton);
        }
      
      if (!userId) {
        throw new Error('User ID is undefined');
      }
      
      const welcomeMessage = `🌙 **Добро пожаловать в бот-анализатор снов!**

Я помогу вам понять значение ваших сновидений, используя различные методики толкования снов.

Выберите сонник для анализа:`;

      // Создаем кнопки для выбора сонника
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📖 Сонник Миллера', 'interpreter_miller')],
        [Markup.button.callback('🧠 Сонник Фрейда', 'interpreter_freud')],
        [Markup.button.callback('🔮 Сонник Цветкова', 'interpreter_tsvetkov')],
        [Markup.button.callback('💭 Сонник Лоффа', 'interpreter_loff')]
      ]);

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });

    } catch (error) {
      console.error('Error in handleStart:', error);
      Logger.log('Error in handleStart:', error);
        await this.initialState(ctx)
    }
  }

  // Обработчик выбора сонника
  async handleInterpreterChoice(ctx: Context): Promise<void> {
    try {
        await sceneManager.deleteAll(ctx);
        const userId = ctx.from?.id;
      
      if (!userId) {
        throw new Error('User ID is undefined');
      }

      const interpreterKey = ctx.match?.[1]; // получаем ключ из callback_data
      
      if (!interpreterKey || !DREAM_INTERPRETERS[interpreterKey]) {
        await ctx.answerCbQuery('Неизвестный сонник');
        return;
      }

      // Обновляем сессию
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.WAITING_DREAM,
        interpreter: interpreterKey as Interpreter,
      });

      const interpreter = DREAM_INTERPRETERS[interpreterKey];
      
      await ctx.answerCbQuery(`Выбран ${interpreter.name}`);
      await ctx.editMessageText(interpreter.description, {
        parse_mode: 'Markdown'
      });
        sceneManager.store(ctx, ctx.callbackQuery?.message?.message_id || 0);

    } catch (error) {
      console.error('Error in handleInterpreterChoice:', error);
      await ctx.answerCbQuery('Произошла ошибка');
      await sceneManager.replyAndStore(ctx,'Произошла ошибка при выборе сонника. Попробуйте начать заново /start');
    }
  }

  // Обработчик текстовых сообщений
  async handleTextMessage(ctx: Context): Promise<void> {
    try {
        await sceneManager.deleteAll(ctx);
        sceneManager.handleInput(ctx);
      const userId = ctx.from?.id;
      
      if (!userId) {
        throw new Error('User ID is undefined');
      }
      const messageText = TextFormatter.removeEmojis((ctx.message as any)?.text || '');

        if (!messageText) {
        await sceneManager.replyAndStore(ctx,'Пожалуйста, отправьте текстовое сообщение.');
        return;
      }

      const session = await this.sessionManager.getSession(userId);

      switch (session.state) {
        case USER_STATES.WAITING_DREAM:
          await this.handleDreamDescription(ctx, userId, messageText, session);
          break;
          
        case USER_STATES.ASKING_QUESTIONS:
          await this.handleQuestionAnswer(ctx, userId, messageText, session);
          break;
          
        case USER_STATES.WAITING_INTERPRETER:
          await sceneManager.replyAndStore(ctx,'Пожалуйста, сначала выберите сонник, нажав /start');
          await this.initialState(ctx);
          break;
          
        case USER_STATES.PROCESSING:
          await sceneManager.replyAndStore(ctx,'Анализирую ваш сон, пожалуйста подождите...');
          break;
          
        default:
          await this.initialState(ctx);
      }

    } catch (error) {
      console.error('Error in handleTextMessage:', error);
      await sceneManager.replyAndStore(ctx,'Произошла ошибка при обработке сообщения. Попробуйте начать заново /start');
    }
  }

  // Обработка описания сна
  async handleDreamDescription(ctx: Context, userId: number, dreamText: string, session: Session): Promise<void> {
      sceneManager.handleInput(ctx);
      await sceneManager.deleteAll(ctx);
    if (dreamText.length < 10) {
      await sceneManager.replyAndStore(ctx,'Пожалуйста, опишите ваш сон более подробно (минимум 10 символов).');
      return;
    }

    if (dreamText.length > 2000) {
      await sceneManager.replyAndStore(ctx,'Описание слишком длинное. Пожалуйста, сократите до 2000 символов.');
      return;
    }

    // Сохраняем описание сна и переходим к вопросам
    await this.sessionManager.updateSessionState(userId, {
      state: USER_STATES.ASKING_QUESTIONS,
      dreamText: dreamText,
      currentQuestion: 0,
      answers: []
    });

    await sceneManager.replyAndStore(ctx,'✅ Описание сна получено!\n\nТеперь ответьте на несколько вопросов для более точного анализа:');
      sceneManager.handleInput(ctx);

    // Задаем первый вопрос
    await this.askNextQuestion(ctx, userId, 0);
  }

  // Обработка ответа на вопрос
  async handleQuestionAnswer(ctx: Context, userId: number, answerText: string, session: Session): Promise<void> {
      sceneManager.handleInput(ctx);
      await sceneManager.deleteAll(ctx);
    // Проверяем длину ответа (до 5 слов)
    const words = answerText.trim().split(/\s+/);
    if (words.length > 5) {
      await sceneManager.replyAndStore(ctx,'Пожалуйста, дайте краткий ответ (до 5 слов).');
      return;
    }

    // Сохраняем ответ
    const updatedSession = await this.sessionManager.addAnswer(userId, answerText);
    
    // Проверяем, есть ли еще вопросы
    if (updatedSession.currentQuestion < CLARIFYING_QUESTIONS.length) {
      await this.askNextQuestion(ctx, userId, updatedSession.currentQuestion);
    } else {
      // Все вопросы заданы, начинаем анализ
      await this.startDreamAnalysis(ctx, userId, updatedSession);
    }
  }

  // Задать следующий вопрос
  async askNextQuestion(ctx: Context, userId: number, questionIndex: number): Promise<void> {
    if (questionIndex < CLARIFYING_QUESTIONS.length) {
      const question = CLARIFYING_QUESTIONS[questionIndex];
      await sceneManager.replyAndStore(ctx,`❓ **Вопрос ${questionIndex + 1}/${CLARIFYING_QUESTIONS.length}:**\n\n${question}`, {
        parse_mode: 'Markdown'
      });
      sceneManager.handleInput(ctx);
    }
  }

  // Начать анализ сна
  async startDreamAnalysis(ctx: Context, userId: number, session: Session): Promise<void> {
      await sceneManager.deleteAll(ctx);
    try {
      // Обновляем состояние на "обработка"
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.PROCESSING
      });
      await this.promoteTGChannel(ctx);
      await sceneManager.replyAndStore(ctx,'🔮 **Анализирую ваш сон...**\n\nЭто может занять несколько секунд.', {
        parse_mode: 'Markdown'
      });

      if (!session.interpreter || !session.dreamText || !session.answers) {
        throw new Error('Недостаточно данных для анализа');
      }

      // Подготавливаем данные для API
      const promptData: PromptData = {
        interpreter: session.interpreter,
        dreamText: session.dreamText,
        answers: session.answers
      };
      // Вызываем API для анализа
      const analysisResult =await this.geminiAPI.callGeminiAPI(promptData);

      // Отправляем результат пользователю
      await ctx.reply(`✨ **Анализ сна завершен:**\n\n${analysisResult}`, {
        parse_mode: 'Markdown'
      });
        await sceneManager.replyAndStore(ctx, 'Попробуйте через 24 часа, лимит запросов на сегодня исчерпан.', this.startButton);

      Logger.log(`User ${userId} received analysis: ${analysisResult}`);

      // Обновляем состояние
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.COMPLETED,
        countAIRequests: session.countAIRequests + 1
      });

    } catch (error) {
      console.error('Error in startDreamAnalysis:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      await sceneManager.replyAndStore(ctx,`😔 Произошла ошибка при анализе сна: ${errorMessage}\n\nПопробуйте еще раз позже или нажмите /start для нового анализа.`);
      
      // Сбрасываем состояние при ошибке
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.WAITING_INTERPRETER
      });
    }
  }

  // Обработчик перезапуска анализа
  async handleRestartAnalysis(ctx: Context): Promise<void> {
    try {
      await ctx.answerCbQuery('Начинаем новый анализ');
      await this.handleStart(ctx);
    } catch (error) {
      console.error('Error in handleRestartAnalysis:', error);
      await ctx.answerCbQuery('Произошла ошибка');
    }
  }

  // Обработчик команды помощи
  async handleHelp(ctx: Context): Promise<void> {
    const helpMessage = `🆘 **Помощь по использованию бота**

**Как пользоваться:**
1. Нажмите /start для начала
2. Выберите один из 4 сонников
3. Опишите ваш сон одним сообщением
4. Ответьте на 5 уточняющих вопросов (до 5 слов каждый)
5. Получите анализ вашего сна

**Доступные команды:**
/start - Начать новый анализ
/help - Показать эту справку

**Сонники:**
📖 Миллер - психологический анализ
🧠 Фрейд - психоаналитический подход  
🔮 Цветков - народные традиции
💭 Лофф - персональный анализ

❓ Если возникли проблемы, попробуйте начать заново с /start`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  }

  // Обработчик неизвестных команд
  async handleUnknownCommand(ctx: Context): Promise<void> {
    await sceneManager.replyAndStore(ctx,'Неизвестная команда. Используйте /start для начала работы или /help для справки.');
  }

  async promoteTGChannel(ctx: Context): Promise<void> {
      const tgChannel = JSON.parse((await readFile('./assets/app-config.json')).toString()).TG_CHANNEL_TO_PROMOTE;
      await sceneManager.replyAndStore(ctx,`Подписывайтесь на наш Telegram-канал ${tgChannel}`);
  }

    async initialState(ctx: Context): Promise<void> {
        await ctx.reply('Добро пожаловать! Нажмите «Старт».', this.startButton);
    }

    async #hasAIPermission(userId: number | undefined): Promise<boolean> {
      if(!(userId === 0 || userId)) return false;
      const session = await this.sessionManager.getSession(userId);
        const {countAIRequests = 0} = session;
        return countAIRequests < 999;
    }

    async #greeting(ctx: Context): Promise<void> {
      await ctx.reply('🪬');
    }
}
