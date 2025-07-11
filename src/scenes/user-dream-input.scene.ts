import {Scenes} from "telegraf";
import DreamAnalyzerBot from "../bot";
import {TextFormatter} from "../services/text-formatter";
import {USER_STATES} from "../constants";

export const userDreamInputSceneFactory = (bot: DreamAnalyzerBot) => {
    return new Scenes.WizardScene<Scenes.WizardContext>(
        'userDreamInputScene',
        async (ctx) => {
            await bot.sceneManager.deleteAll(ctx);
            // const message = ctx.i18n.t("oneMessagePrompt");
            // await bot.sceneManager.replyAndStore(ctx, message);
            await bot.sceneManager.replyAndStore(ctx, '💭 **Расскажи свой сон одним сообщением.**\n\nПиши всё, что вспомнишь: события, людей, образы, цвета, эмоции.',  {
                parse_mode: 'Markdown'
            });
            ctx.wizard.next();
        },
        async(ctx) => {
            await bot.sceneManager.deleteAll(ctx);
            bot.sceneManager.handleInput(ctx);
            if((ctx.message as any)?.text) {
                const messageText = TextFormatter.removeEmojis((ctx.message as any)?.text || '');
                if (messageText.length < 10) {
                // const message = ctx.i18n.t("dreamTooShort");
                // await bot.sceneManager.replyAndStore(ctx, message);
                await bot.sceneManager.replyAndStore(ctx, 'Пожалуйста, опишите ваш сон более подробно (минимум 10 символов).');
                    return;
                }

                if (messageText.length > 2000) {
                    // const message = ctx.i18n.t("dreamTooLong");
                    // await bot.sceneManager.replyAndStore(ctx, message);
                    await bot.sceneManager.replyAndStore(ctx, 'Описание слишком длинное. Пожалуйста, сократите до 2000 символов.');
                    return;
                }

                // Сохраняем описание сна и переходим к вопросам
                await bot.user.updateDialogSession({
                    state: USER_STATES.ASKING_QUESTIONS,
                    dreamText: messageText,
                    currentQuestion: 0,
                    answers: []
                });

                // await bot.sceneManager.replyAndStore(ctx,'✅ Описание сна получено!\n\nТеперь ответьте на несколько вопросов для более точного анализа:');
                // // Задаем первый вопрос
                // await ctx.scene.enter('analyzeDreamScene');
            }
        }
    );
};
