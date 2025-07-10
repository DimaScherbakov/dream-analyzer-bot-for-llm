import {MyContext} from "../types/context.interface";
import {Markup} from "telegraf";
import {readFile} from "node:fs/promises";
import * as fs from "node:fs";

export default class SceneManager {
    startButton = Markup.button.callback('🚀 Старт', 'start');
    interpreterButtons = [
        [
            Markup.button.callback('📖 Сонник Миллера', 'interpreter_miller'),
            Markup.button.callback('🧠 Сонник Фрейда', 'interpreter_freud')
        ],
        [
            Markup.button.callback('🔮 Сонник Цветкова', 'interpreter_tsvetkov'),
            // Markup.button.callback('💭 Сонник Лоффа', 'interpreter_loff'),
            // Markup.button.callback('💭 Сонник Канта', 'interpreter_kant')
            Markup.button.callback('💭 Сонник Юнга', 'interpreter_jung')
        ],
    ];

    #initSession(ctx: MyContext) {
        if(!ctx.session) ctx.session = {allMessageIds: []}

        if (!ctx.session.allMessageIds) {
            ctx.session.allMessageIds = [];
        }
    }

    store(ctx: MyContext, messageId: number) {
        this.#initSession(ctx);
        ctx.session?.allMessageIds?.push(messageId);
    }

    async deleteAll(ctx: MyContext) {
        this.#initSession(ctx);

        for (const id of ctx.session.allMessageIds || []) {
            try {
                await ctx.deleteMessage(id);
            } catch {}
        }
        ctx.session.allMessageIds = [];
    }

    async replyAndStore(ctx: MyContext, text: string, config = {}) {
        const msg = await ctx.reply(text, config);
        this.store(ctx, msg.message_id);
    }

    handleInput(ctx: MyContext) {
        if (ctx.message && 'message_id' in ctx.message) {
            this.store(ctx, ctx.message.message_id);
        }
    }

    async initialState(ctx: MyContext): Promise<void> {
        this.handleInput(ctx);
        await ctx.replyWithPhoto(
            {
                source: fs.createReadStream('./2.jpg'),
                filename: '2.jpg'
            },
            {
                //   caption: 'Написати сон',
                ...Markup.inlineKeyboard([this.startButton])
            }
        );
        await this.deleteAll(ctx);
    }


    async promoteTGChannel(ctx: MyContext): Promise<void> {
        const tgChannel = JSON.parse((await readFile('./assets/app-config.json')).toString()).TG_CHANNEL_TO_PROMOTE;
        await this.replyAndStore(ctx,`Подпишись на наш телеграм канал и получи ответ ${tgChannel}`);
    }
}
