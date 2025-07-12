import {SceneSession} from "./session.interface";
import {Scenes} from "telegraf";
import TelegrafI18n from "telegraf-i18n";

export interface MyContext extends Scenes.WizardContext {
    session: SceneSession;
    match?: RegExpMatchArray;
    i18n: TelegrafI18n;
}
