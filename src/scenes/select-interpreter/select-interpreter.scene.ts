import {Scenes} from "telegraf";
import DreamAnalyzerBot from "../../bot";
import {startAnalyzeDream} from "./steps/start";
import {selectInterpreterInput} from "./steps/select-interpreter.input";

export const selectInterpreterSceneFactory = (bot: DreamAnalyzerBot) => {
    return new Scenes.WizardScene<Scenes.WizardContext>(
        'selectInterpreterScene',
        (ctx) => startAnalyzeDream(ctx, bot),
        ctx => selectInterpreterInput(ctx,bot),
    );
};
