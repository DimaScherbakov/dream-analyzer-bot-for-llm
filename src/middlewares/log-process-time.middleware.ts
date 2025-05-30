import {Context as TelegrafContext} from "telegraf/typings/context";

const logProcessTimeMiddleware = async (ctx: TelegrafContext, next: () => Promise<void>) => {
    const start = Date.now();
    const userId = ctx.from?.id;
    const messageType = ctx.updateType;

    console.log(`[Bot log ${new Date().toISOString()}] User ${userId} - ${messageType}`);

    try {
        await next();
    } catch (error) {
        console.error(`Error processing update for user ${userId}:`, error);

        // Отправляем пользователю сообщение об ошибке
        try {
            await ctx.reply('Произошла внутренняя ошибка. Попробуйте позже или начните заново с /start');
        } catch (replyError) {
            console.error('Error sending error message:', replyError);
        }
    }

    const ms = Date.now() - start;
    console.log(`Processed in ${ms}ms`);
}

export default logProcessTimeMiddleware;
