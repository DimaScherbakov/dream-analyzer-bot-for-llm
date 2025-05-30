import {Context} from "../types/context.interface";

class SceneManager {
    #initSession(ctx: Context) {
        if(!ctx.session) ctx.session = {allMessageIds: []}

        if (!ctx.session.allMessageIds) {
            ctx.session.allMessageIds = [];
        }
    }

    store(ctx: Context, messageId: number) {
        this.#initSession(ctx);
        ctx.session?.allMessageIds.push(messageId);
    }

    async deleteAll(ctx: Context) {
        this.#initSession(ctx);
        if(!ctx.session) ctx.session = {allMessageIds: []}

        for (const id of ctx.session.allMessageIds) {
            try {
                await ctx.deleteMessage(id);
            } catch {}
        }
        ctx.session.allMessageIds = [];
    }

    async replyAndStore(ctx: Context, text: string, config = {}) {
        const msg = await ctx.reply(text, config);
        this.store(ctx, msg.message_id);
    }

    handleInput(ctx: Context) {
        if (ctx.message && 'message_id' in ctx.message) {
            this.store(ctx, ctx.message.message_id);
        }
    }
}

export default new SceneManager();
