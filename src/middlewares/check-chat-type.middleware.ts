import {Context as TelegrafContext} from "telegraf/typings/context";

const checkChatTypeMiddleware = async (ctx: TelegrafContext, next: () => Promise<void>) => {
    if (ctx.chat && ctx.chat.type !== 'private') {
        // const message = ctx.i18n.t('onlyPrivate');
        // await ctx.reply(message);

        await ctx.reply('Этот бот работает только в приватных сообщениях.');
        return;
    }
    await next();
}

export default checkChatTypeMiddleware;
