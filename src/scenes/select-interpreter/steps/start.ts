import {Markup} from "telegraf";
import {MyContext} from "../../../types/context.interface";
import {greeting} from "../../../messages/greeting";
import DreamAnalyzerBot from "../../../bot";
import {Logger} from "../../../services/logger";

export const startAnalyzeDream = async (ctx: MyContext, bot: DreamAnalyzerBot) => {
    console.log('[StartAnalyzeDream] step started');
    try {
        if(ctx.session && !ctx.session.isGreeted) {
            await greeting(ctx);
            ctx.session.isGreeted = true;
        }
        await bot.user.updateDialogSession({
            interpreter: undefined,
        });
        bot.sceneManager.handleInput(ctx as MyContext);
        await bot.sceneManager.deleteAll(ctx  as MyContext);
        ctx.deleteMessage && await ctx.deleteMessage();
        const userId = ctx.from?.id;

        if (!userId) {
            throw new Error('User ID is undefined');
        }

        if(!(await bot.user.hasAIPermission())) {
            const message = ctx.i18n.t("tryAgain");
            return await bot.sceneManager.replyAndStore(ctx as MyContext, message, Markup.inlineKeyboard([bot.sceneManager.startButton(ctx)]));

            // return await bot.sceneManager.replyAndStore(ctx as MyContext, 'Попробуйте через 24 часа, лимит запросов на сегодня исчерпан.', Markup.inlineKeyboard([bot.sceneManager.startButton]));
        }

        const welcomeMessage = `🌙 **Добро пожаловать в бот-анализатор снов!**

Я помогу вам понять значение ваших сновидений, используя различные методики толкования снов.

Выберите сонник для анализа:`;
        // Создаем кнопки для выбора сонника
        const keyboard = Markup.inlineKeyboard([
            ...bot.sceneManager.interpreterButtons
        ]);

        await ctx.reply(welcomeMessage, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        return ctx.wizard.next();

    } catch (error) {
        console.error('Error in handleStart:', error);
        Logger.log('Error in handleStart:', error);
        await bot.sceneManager.initialState(ctx);
    }
}
