import {Context as TelegramContext} from "telegraf/typings/context";
import {SceneSession, Session} from "./session.interface";

export interface Context extends TelegramContext {
    session?: SceneSession;
    match?: RegExpMatchArray;
}
