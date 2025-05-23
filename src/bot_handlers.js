const { Markup } = require('telegraf');
const { DREAM_INTERPRETERS, CLARIFYING_QUESTIONS, USER_STATES } = require('./constants');

class BotHandlers {
  constructor(sessionManager, geminiAPI) {
    this.sessionManager = sessionManager;
    this.geminiAPI = geminiAPI;
  }

  // Обработчик команды /start
  async handleStart(ctx) {
    try {
      const userId = ctx.from.id;
      
      // Сбрасываем сессию пользователя
      await this.sessionManager.resetSession(userId);
      
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
      await ctx.reply('Произошла ошибка при запуске. Попробуйте еще раз.');
    }
  }

  // Обработчик выбора сонника
  async handleInterpreterChoice(ctx) {
    try {
      const userId = ctx.from.id;
      const interpreterKey = ctx.match[1]; // получаем ключ из callback_data
      
      if (!DREAM_INTERPRETERS[interpreterKey]) {
        await ctx.answerCbQuery('Неизвестный сонник');
        return;
      }

      // Обновляем сессию
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.WAITING_DREAM,
        interpreter: interpreterKey
      });

      const interpreter = DREAM_INTERPRETERS[interpreterKey];
      
      await ctx.answerCbQuery(`Выбран ${interpreter.name}`);
      await ctx.editMessageText(interpreter.description, {
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error in handleInterpreterChoice:', error);
      await ctx.answerCbQuery('Произошла ошибка');
      await ctx.reply('Произошла ошибка при выборе сонника. Попробуйте начать заново /start');
    }
  }

  // Обработчик текстовых сообщений
  async handleTextMessage(ctx) {
    try {
      const userId = ctx.from.id;
      const messageText = ctx.message.text;
      const session = await this.sessionManager.getSession(userId);

      switch (session.state) {
        case USER_STATES.WAITING_DREAM:
          await this.handleDreamDescription(ctx, userId, messageText, session);
          break;
          
        case USER_STATES.ASKING_QUESTIONS:
          await this.handleQuestionAnswer(ctx, userId, messageText, session);
          break;
          
        case USER_STATES.WAITING_INTERPRETER:
          await ctx.reply('Пожалуйста, сначала выберите сонник, нажав /start');
          break;
          
        case USER_STATES.PROCESSING:
          await ctx.reply('Анализирую ваш сон, пожалуйста подождите...');
          break;
          
        default:
          await ctx.reply('Для начала работы нажмите /start');
      }

    } catch (error) {
      console.error('Error in handleTextMessage:', error);
      await ctx.reply('Произошла ошибка при обработке сообщения. Попробуйте начать заново /start');
    }
  }

  // Обработка описания сна
  async handleDreamDescription(ctx, userId, dreamText, session) {
    if (dreamText.length < 10) {
      await ctx.reply('Пожалуйста, опишите ваш сон более подробно (минимум 10 символов).');
      return;
    }

    if (dreamText.length > 2000) {
      await ctx.reply('Описание слишком длинное. Пожалуйста, сократите до 2000 символов.');
      return;
    }

    // Сохраняем описание сна и переходим к вопросам
    await this.sessionManager.updateSessionState(userId, {
      state: USER_STATES.ASKING_QUESTIONS,
      dreamText: dreamText,
      currentQuestion: 0,
      answers: []
    });

    await ctx.reply('✅ Описание сна получено!\n\nТеперь ответьте на несколько вопросов для более точного анализа:');
    
    // Задаем первый вопрос
    await this.askNextQuestion(ctx, userId, 0);
  }

  // Обработка ответа на вопрос
  async handleQuestionAnswer(ctx, userId, answerText, session) {
    // Проверяем длину ответа (до 5 слов)
    const words = answerText.trim().split(/\s+/);
    if (words.length > 5) {
      await ctx.reply('Пожалуйста, дайте краткий ответ (до 5 слов).');
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
  async askNextQuestion(ctx, userId, questionIndex) {
    if (questionIndex < CLARIFYING_QUESTIONS.length) {
      const question = CLARIFYING_QUESTIONS[questionIndex];
      await ctx.reply(`❓ **Вопрос ${questionIndex + 1}/${CLARIFYING_QUESTIONS.length}:**\n\n${question}`, {
        parse_mode: 'Markdown'
      });
    }
  }

  // Начать анализ сна
  async startDreamAnalysis(ctx, userId, session) {
    try {
      // Обновляем состояние на "обработка"
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.PROCESSING
      });

      await ctx.reply('🔮 **Анализирую ваш сон...**\n\nЭто может занять несколько секунд.', {
        parse_mode: 'Markdown'
      });

      // Подготавливаем данные для API
      const promptData = {
        interpreter: session.interpreter,
        dreamText: session.dreamText,
        answers: session.answers
      };

      // Вызываем API для анализа
      const analysisResult = await this.geminiAPI.callGeminiAPI(promptData);

      // Отправляем результат пользователю
      await ctx.reply(`✨ **Анализ сна завершен:**\n\n${analysisResult}`, {
        parse_mode: 'Markdown'
      });

      // Предлагаем начать заново
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Проанализировать новый сон', 'restart_analysis')]
      ]);

      await ctx.reply('Хотите проанализировать еще один сон?', keyboard);

      // Обновляем состояние
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.COMPLETED
      });

    } catch (error) {
      console.error('Error in startDreamAnalysis:', error);
      
      await ctx.reply(`😔 Произошла ошибка при анализе сна: ${error.message}\n\nПопробуйте еще раз позже или нажмите /start для нового анализа.`);
      
      // Сбрасываем состояние при ошибке
      await this.sessionManager.updateSessionState(userId, {
        state: USER_STATES.WAITING_INTERPRETER
      });
    }
  }

  // Обработчик перезапуска анализа
  async handleRestartAnalysis(ctx) {
    try {
      await ctx.answerCbQuery('Начинаем новый анализ');
      await this.handleStart(ctx);
    } catch (error) {
      console.error('Error in handleRestartAnalysis:', error);
      await ctx.answerCbQuery('Произошла ошибка');
    }
  }

  // Обработчик команды помощи
  async handleHelp(ctx) {
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
  async handleUnknownCommand(ctx) {
    await ctx.reply('Неизвестная команда. Используйте /start для начала работы или /help для справки.');
  }
}

module.exports = BotHandlers;