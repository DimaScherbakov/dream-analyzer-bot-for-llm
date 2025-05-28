import {Context as TelegramContext} from "telegraf/typings/context";
import {Session} from "./session.interface";

export interface Context extends TelegramContext {
    session?: Session;
    match?: RegExpMatchArray;
}
