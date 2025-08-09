import { Bot, Context, session, InlineKeyboard } from 'grammy';
import type { SessionFlavor } from 'grammy';
import GeminiAPI from './services/gemini-api';
import { LANG } from './constants';

// Import locale dictionaries. These JSON files mirror the contents of the
// original Telegraf bot's i18n locale files. TypeScript's resolveJsonModule
// option in tsconfig.json allows importing JSON files directly.
import ru from './locales/ru.json';
import uk from './locales/uk.json';

// Define the per-user session shape. The bot has a simple state machine:
//  - idle: the user is not in any conversation
//  - await_dream: the bot is waiting for the user to send a dream description
export interface DreamSession {
  stage: 'idle' | 'await_dream';
  language: LANG;
}

// Augment the grammy context with our session state.
export type BotContext = Context & SessionFlavor<DreamSession>;

// Translation dictionaries keyed by language. These objects contain all
// strings from the original `ru.json` and `uk.json` locale files. If a
// translation is missing for a key, a fallback is provided.
const translations: Record<LANG, Record<string, string>> = {
  [LANG.RU]: ru as Record<string, string>,
  [LANG.UK]: uk as Record<string, string>,
};

/**
 * Helper function to fetch a translation. If the key or language is missing
 * a sensible fallback is returned (the key itself).
 */
function t(key: string, lang: LANG): string {
  const langDict = translations[lang] ?? {};
  const val = langDict[key];
  if (typeof val === 'string') return val;
  // Fallback to Russian if available
  const ruVal = translations[LANG.RU][key];
  return ruVal ?? key;
}

export default class DreamAnalyzerBot {
  private bot: Bot<BotContext>;
  private gemini: GeminiAPI;

  constructor() {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      throw new Error('BOT_TOKEN is not defined in environment variables');
    }
    this.bot = new Bot<BotContext>(token);
    this.gemini = new GeminiAPI();

    // Register the session middleware. Each user will get an independent
    // DreamSession object. If none exists, it will be initialised as below.
    this.bot.use(
      session({
        initial: (): DreamSession => ({ stage: 'idle', language: LANG.RU }),
      }),
    );

    // Set up handlers for commands, callbacks and messages.
    this.setupHandlers();
  }

  /**
   * Configure the bot command handlers.
   */
  private setupHandlers() {
    // Start command resets the session and asks for a language.
    this.bot.command('start', async (ctx) => {
      ctx.session.stage = 'idle';
      // Always default to RU until the user chooses otherwise
      ctx.session.language = LANG.RU;
      const keyboard = new InlineKeyboard()
        .text('Русский', 'lang_ru')
        .text('Українська', 'lang_uk');
      // Use the `selectLanguage` key from the translations as the prompt for
      // choosing a language. If it is missing, fall back to a simple phrase.
      const prompt = t('selectLanguage', ctx.session.language) ||
        (ctx.session.language === LANG.RU ? 'Выберите язык' : 'Виберіть мову');
      await ctx.reply(prompt, {
        reply_markup: keyboard,
      });
    });

    // Handle language selection via callback query
    this.bot.callbackQuery(/lang_(ru|uk)/, async (ctx) => {
      const choice = ctx.match?.[1];
      if (choice === 'ru' || choice === 'uk') {
        ctx.session.language = choice as LANG;
      }
      ctx.session.stage = 'await_dream';
      await ctx.answerCallbackQuery();
      // Use the oneMessagePrompt key for asking the user to describe their dream.
      await ctx.reply(t('oneMessagePrompt', ctx.session.language));
    });

    // Handle incoming text messages. Only process them when we are
    // expecting a dream description.
    this.bot.on('message:text', async (ctx) => {
      if (ctx.session.stage !== 'await_dream') return;
      const text = ctx.message.text?.trim() ?? '';
      // Basic validation on the dream text length
      if (text.length < 10) {
        await ctx.reply(t('dreamTooShort', ctx.session.language));
        return;
      }
      if (text.length > 2000) {
        await ctx.reply(t('dreamTooLong', ctx.session.language));
        return;
      }
      try {
        // Build the prompt data expected by the Gemini service
        const promptData = {
          interpreter: 'miller',
          dreamText: text,
          answers: [] as string[],
        };
        // Call the Gemini API
        const result = await this.gemini.callGeminiAPI(promptData, {
          // Provide a minimal i18n-like interface with a t() function for GeminiAPI
          t: (key: string, opts?: any) => t(key, ctx.session.language),
        } as any);
        await ctx.reply(result, { parse_mode: 'Markdown' });
      } catch (err) {
        console.error('Gemini API error:', err);
        await ctx.reply(t('dreamAnalysisError', ctx.session.language));
      }
      // Reset the state after processing the dream
      ctx.session.stage = 'idle';
    });

    // Global error handler to prevent the bot from crashing on exceptions
    this.bot.catch((err) => {
      console.error('Bot error:', err);
    });
  }

  /**
   * Start the bot in polling mode. For grammY, `bot.start()` initiates the
   * long-polling loop. This function mirrors the old Telegraf API.
   */
  public async startPolling(): Promise<void> {
    await this.bot.start();
  }

  /**
   * Configure and start the bot in webhook mode. The implementation is
   * analogous to Telegraf: grammY accepts a webhook configuration when
   * calling `bot.start()`. Returns the path of the webhook so that
   * Server can expose the proper endpoint.
   */
  public async setupWebhook(): Promise<string> {
    const domain = process.env.WEBHOOK_URL;
    if (!domain) {
      throw new Error('WEBHOOK_URL is not defined in environment variables');
    }
    const port = 443;
    const path = `/webhook/${process.env.BOT_TOKEN}`;
    await this.bot.start({
      webhook: {
        domain,
        port,
        path,
      },
    });
    return path;
  }

  /**
   * Stop the bot. The grammY API accepts a signal name optionally but it
   * is ignored here. This mirrors the Telegraf `stop()` method.
   */
  public async stop(signal?: string): Promise<void> {
    await this.bot.stop();
  }

  /**
   * Expose the underlying grammY Bot instance. This is used by the
   * Express server to manually dispatch updates when using webhooks.
   */
  public getBot(): Bot<BotContext> {
    return this.bot;
  }
}