import DreamAnalyzerBot from "../bot";
import {Markup, Scenes} from "telegraf";
import {USER_STATES} from "../constants";
import {PromptData} from "../types/prompt-data.interface";
import {Logger} from "../services/logger";
import {TextFormatter} from "../services/text-formatter";
import {MyContext} from "../types/context.interface";

export const analyzeDreamSceneFactory = (bot: DreamAnalyzerBot) => {
    return new Scenes.WizardScene<Scenes.WizardContext>(
        'analyzeDreamScene',
        async (ctx: MyContext) => {
            console.log('[analyzeDreamScene] step started');
            await bot.sceneManager.deleteAll(ctx);
            try {
                // Обновляем состояние на "обработка"
                await bot.user.updateDialogSession({
                    state: USER_STATES.PROCESSING
                });
                const session = await bot.user.getDialogSession();
                await bot.sceneManager.promoteTGChannel(ctx);
                await new Promise(resolve => setTimeout(resolve, 15000)); // Задержка для лучшего UX
                await bot.sceneManager.deleteAll(ctx);
                await bot.sceneManager.replyAndStore(ctx,'🔮 **Анализирую ваш сон...**\n\nЭто может занять несколько секунд.', {
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
                const analysisResult =await bot.getGeminiAPI().callGeminiAPI(promptData)
                    .then(text => {
                        Logger.log(`[gemini] original ${text}`);
                        return text;
                    })
                    .then(text => TextFormatter.escapeMarkdown(text));

                await bot.sceneManager.deleteAll(ctx);
                // Отправляем результат пользователю
                await ctx.replyWithMarkdownV2(`✨ **Анализ сна завершен:**\n\n${analysisResult}`);
                Logger.log(`User ${bot.user.id} received analysis: ${analysisResult}`);

                // Обновляем состояние
                await bot.user.updateDialogSession({
                    state: USER_STATES.COMPLETED,
                    countAIRequests: session.countAIRequests + 1
                });
                await bot.sceneManager.deleteAll(ctx);
                if(!(await bot.user.hasAIPermission())) {
                    await bot.sceneManager.replyAndStore(ctx, 'Попробуйте через 24 часа, лимит запросов на сегодня исчерпан.', Markup.inlineKeyboard([bot.sceneManager.startButton]));
                } else {
                    await bot.sceneManager.initialState(ctx);
                }
                await bot.user.updateDialogSession({
                    interpreter: undefined,
                });
                ctx.session.isGreeted = false;
                await ctx.scene.leave();
            } catch (error) {
                console.error('Error in startDreamAnalysis:', error);

                const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
                await bot.sceneManager.replyAndStore(ctx,`😔 Произошла ошибка при анализе сна: ${errorMessage}\n\nПопробуйте еще раз позже или нажмите /start для нового анализа.`);

                // Сбрасываем состояние при ошибке
                await bot.user.updateDialogSession({
                    state: USER_STATES.WAITING_INTERPRETER,
                    interpreter: undefined,
                });
                ctx.session.isGreeted = false;
                await ctx.scene.leave();
            }
        }
    );
};
