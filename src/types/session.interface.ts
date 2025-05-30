import {Interpreter} from "./prompt-data.interface";

export interface SceneSession {
    allMessageIds: number[];
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
