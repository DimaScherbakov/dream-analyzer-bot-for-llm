import {Scenes} from "telegraf";
import DreamAnalyzerBot from "../bot";
import {Markup} from "telegraf";
import {LANG} from "../constants";
import {MyContext} from "../types/context.interface";

function isKnownLanguage(languageCode: string): boolean {
    return Object.keys(LANG).includes(languageCode.toUpperCase());
}

export const selectLanguageSceneFactory = (bot: DreamAnalyzerBot) => {
    return new Scenes.WizardScene<Scenes.WizardContext>(
        'selectLanguageScene',
        async (ctx) => {
            try {
                console.log('[selectLanguageSceneFactory] 1 step started');
                const i18n = (ctx as any).i18n;
                await bot.sceneManager.deleteAll(ctx as MyContext);
                if(ctx.from?.language_code && isKnownLanguage(ctx.from?.language_code)) {
                    // Если язык уже выбран, просто устанавливаем его
                    i18n.locale(ctx.from?.language_code);
                    ctx.session.isLanguageSelected = true;
                }
                if((ctx.session as any).isLanguageSelected) {
                    return ctx.scene.enter('userDreamInputScene');
                }
                // Создаем кнопки для языков
                const keyboard = Markup.inlineKeyboard([
                    ...bot.sceneManager.languageButtons
                ]);
                await ctx.reply(i18n.t('selectLanguage'), {
                    parse_mode: 'Markdown',
                    ...keyboard
                });
                return ctx.wizard.next();
            } catch (error) {
                console.error('Error in selectLanguageSceneFactory:', error);
                bot.sceneManager.replyAndStore(ctx as MyContext, 'Произошла ошибка при выборе языка');
            }
        },
        async (ctx) => {
            try {
                console.log('[selectLanguageSceneFactory] 2 step started',);
                const callbackData = (ctx.callbackQuery as any)?.data;
                const i18n = (ctx as any).i18n;
                i18n.locale(callbackData);
                await ctx.answerCbQuery(i18n.t('languageSelected', {language: i18n.t(callbackData)}));
                bot.sceneManager.store(ctx as MyContext, ctx.callbackQuery?.message?.message_id || 0);
                ctx.session.isLanguageSelected = true;
                return ctx.scene.enter('userDreamInputScene');
            } catch (error) {
                console.error('Error in selectLanguageSceneFactory:', error);
                bot.sceneManager.replyAndStore(ctx as MyContext, 'Произошла ошибка при выборе языка');
            }
        }
    );
};
