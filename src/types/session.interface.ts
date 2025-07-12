import {Interpreter} from "./prompt-data.interface";
import {Scenes} from "telegraf";

export interface SceneSession extends Scenes.WizardSession {
    allMessageIds?: number[];
    isGreeted?: boolean;
    language?: string;
    isLanguageSelected?: boolean;
}

export interface Session {
    state: string;
    interpreter?: Interpreter;
    dreamText?: string;
    currentQuestion: number;
    answers: string[];
    createdAt: string;
    countAIRequests: number;
}
