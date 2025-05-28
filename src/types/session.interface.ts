import {Interpreter} from "./prompt-data.interface";

export interface Session {
    state: string;
    interpreter?: Interpreter;
    dreamText?: string;
    currentQuestion: number;
    answers: string[];
    createdAt: string;
}
