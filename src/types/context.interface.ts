import {SceneSession} from "./session.interface";
import {Scenes} from "telegraf";

export interface MyContext extends Scenes.WizardContext {
    session: SceneSession;
    match?: RegExpMatchArray;
}
