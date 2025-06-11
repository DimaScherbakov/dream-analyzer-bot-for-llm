import {Context as TelegrafContext} from "telegraf/typings/context";
import {User} from "../user";
import {SessionManager} from "../services/session-manager";

const userFactory = (ctx: TelegrafContext, sessionManager: SessionManager) => {
    return new User(ctx.from?.id || 0, sessionManager);
}
export default userFactory;
