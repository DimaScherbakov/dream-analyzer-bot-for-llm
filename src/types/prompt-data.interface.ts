export type Interpreter =  'freud' | 'miller' | 'tsvetkov' | 'loff';
export interface PromptData {
    interpreter: Interpreter;
    dreamText: string;
    answers: string[];
}
