import DreamAnalyzerBot from "../bot";
import {Scenes} from "telegraf";
import {CLARIFYING_QUESTIONS} from "../constants";
import {MyContext} from "../types/context.interface";

export const askQuestionsSceneFactory = (bot: DreamAnalyzerBot) => {
    return new Scenes.WizardScene<Scenes.WizardContext>(
        'askQuestionsScene',
        async (ctx) => {
            console.log('[ask question step]');
            const currentQuestionId = (await bot.user.getDialogSession()).currentQuestion || 0;
            const question = CLARIFYING_QUESTIONS[currentQuestionId];
            await bot.sceneManager.replyAndStore(ctx,`❓ **Вопрос ${currentQuestionId + 1}/${CLARIFYING_QUESTIONS.length}:**\n\n${question}`, {
                parse_mode: 'Markdown'
            });
            bot.sceneManager.handleInput(ctx);
            ctx.wizard.next();
        },
        (ctx) => handleQuestionAnswer(ctx, ctx.from?.id as number, (ctx.message as any)?.text || '', bot),
    );
};

const handleQuestionAnswer = async(ctx: MyContext, userId: number, answerText: string, bot: DreamAnalyzerBot): Promise<void> => {
    console.log('[answer question step]');
    bot.sceneManager.handleInput(ctx);
    await bot.sceneManager.deleteAll(ctx);
    // Проверяем длину ответа (до 5 слов)
    const words = answerText.trim().split(/\s+/);
    if (words.length > 5) {
    await bot.sceneManager.replyAndStore(ctx,'Пожалуйста, дайте краткий ответ (до 5 слов).');
    return;
}
// Сохраняем ответ
const updatedSession = await bot.user.addAnswer(answerText);
// Проверяем, есть ли еще вопросы
if (updatedSession.currentQuestion < CLARIFYING_QUESTIONS.length) {
    await ctx.scene.leave();
    await ctx.scene.enter('askQuestionsScene');
} else {
    // Все вопросы заданы, начинаем анализ
    await ctx.scene.leave();
    await ctx.scene.enter('analyzeDreamScene');
}
}
