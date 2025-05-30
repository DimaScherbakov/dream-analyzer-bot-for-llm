import {Context as TelegrafContext} from "telegraf/typings/context";

const checkChatTypeMiddleware = async (ctx: TelegrafContext, next: () => Promise<void>) => {
    if (ctx.chat && ctx.chat.type !== 'private') {
        await ctx.reply('Этот бот работает только в приватных сообщениях.');
        return;
    }
    await next();
}

export default checkChatTypeMiddleware;
