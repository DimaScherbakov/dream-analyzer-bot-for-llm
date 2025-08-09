import { PromptData } from '../types/prompt-data.interface';
import { GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { Logger } from './logger';
import { TextFormatter } from './text-formatter';

/**
 * Wrapper around the Google Gemini API. This implementation mirrors the
 * original Telegraf-based service and is used by both the Telegraf and
 * grammY versions of the bot. It expects a prompt in the structure
 * described by the PromptData interface and returns a truncated response.
 */
export default class GeminiAPI {
  private readonly model = 'gemini-2.0-flash-exp';
  private readonly ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Main method to call the Gemini API. It accepts a prompt description and
   * an object with a translation function `t()`. When run, the API is
   * invoked with a fixed set of parameters. The first candidate is used
   * as the answer and truncated to 4000 characters.
   */
  async callGeminiAPI(promptData: PromptData, i18n: { t: (key: string, opts?: any) => string }): Promise<string> {
    try {
      const { dreamText, answers } = promptData;

      // Build the prompt text. The i18n wrapper is passed in so the prompt
      // can be localised outside of this service.
      const prompt = this.buildPrompt(i18n, dreamText, answers);

      const config: GenerateContentConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        httpOptions: {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };

      console.log('Sending request to Gemini API...');
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config,
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('Invalid response from Gemini API');
      }

      Logger.log('[gemini]', `${response.text?.substring(0, 200)} --> prompt:${response.usageMetadata?.promptTokenCount} + candidates:${response.usageMetadata?.candidatesTokenCount} = total:${response.usageMetadata?.totalTokenCount}`);
      // Limit the result to 4000 characters to satisfy Telegram limits
      return TextFormatter.truncateText(response.text || '', 4000);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('An error occurred while contacting the AI.');
    }
  }

  /**
   * Build the prompt for the Gemini API. It randomises the dream interpreter
   * name and adds the user-provided answers to the prompt. The i18n
   * parameter is expected to contain a translation function.
   */
  buildPrompt(i18n: { t: (key: string, opts?: any) => string }, dreamText: string, answers: string[]): string {
    const interpreterNames = {
      miller: 'Миллера',
      freud: 'Фрейда',
      tsvetkov: 'Цветкова',
      loff: 'Лоффа',
      kant: 'Канта',
      jung: 'Юнга',
    } as const;
    const keys = Object.keys(interpreterNames) as (keyof typeof interpreterNames)[];
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const interpreterName = interpreterNames[randomKey];
    console.log(`[gemini] selected interpreter: ${randomKey}`);
    const promptTemplate = i18n.t('dreamPrompt', { dream: dreamText }) ?? dreamText;
    let prompt = promptTemplate;

    // Additional clarifying questions
    const questions = [
      'Эмоции во сне',
      'Преобладающий цвет',
      'Другие персонажи',
      'Место действия',
      'Самое удивительное',
    ];
    answers.forEach((answer, index) => {
      if (answer && answer.trim() && index < questions.length) {
        prompt += `\n- ${questions[index]}: ${answer}`;
      }
    });
    const requirements = i18n.t('dreamRequirements') ?? '';
    prompt += requirements;
    return prompt;
  }

  /**
   * Perform a health check against the Gemini API. In the minimal rewrite
   * this simply returns `true` without actually hitting the API. Retained
   * for API compatibility.
   */
  async checkAPIHealth(): Promise<boolean> {
    try {
      // The real implementation could call `this.callGeminiAPI()` with test
      // data, but this is skipped here to avoid quota usage.
      return true;
    } catch (error) {
      console.error('API Health Check Failed:', (error as Error).message);
      return false;
    }
  }
}