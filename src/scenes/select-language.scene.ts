import {Scenes} from "telegraf";
import DreamAnalyzerBot from "../bot";
import {Markup} from "telegraf";

export const selectLanguageSceneFactory = (bot: DreamAnalyzerBot) => {
    return new Scenes.WizardScene<Scenes.WizardContext>(
        'selectLanguageScene',
        async (ctx) => {
            try {
                console.log('[selectLanguageSceneFactory] 1 step started');
                await bot.sceneManager.deleteAll(ctx);
                if(ctx.session.isLanguageSelected) {
                    return ctx.scene.enter('userDreamInputScene');
                }
                // Создаем кнопки для языков
                const keyboard = Markup.inlineKeyboard([
                    ...bot.sceneManager.languageButtons
                ]);
                await ctx.reply(ctx.i18n.t('selectLanguage'), {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                return ctx.wizard.next();
            } catch (error) {
                console.error('Error in selectLanguageSceneFactory:', error);
                bot.sceneManager.replyAndStore(ctx, 'Произошла ошибка при выборе языка');
            }
        },
        async (ctx) => {
            try {
                console.log('[selectLanguageSceneFactory] 2 step started',);
                const callbackData = (ctx.callbackQuery as any)?.data;
                ctx.i18n.locale(callbackData);
                await ctx.answerCbQuery(ctx.i18n.t('languageSelected', {language: ctx.i18n.t(callbackData)}));
                bot.sceneManager.store(ctx, ctx.callbackQuery?.message?.message_id || 0);
                ctx.session.isLanguageSelected = true;
                return ctx.scene.enter('userDreamInputScene');
            } catch (error) {
                console.error('Error in selectLanguageSceneFactory:', error);
                bot.sceneManager.replyAndStore(ctx, 'Произошла ошибка при выборе языка');
            }
        }
    );
};
