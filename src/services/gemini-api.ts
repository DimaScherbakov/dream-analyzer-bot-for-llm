import {PromptData} from "../types/prompt-data.interface";
import {GenerateContentConfig, GoogleGenAI} from "@google/genai";
import {Logger} from "./logger";
import {TextFormatter} from "./text-formatter";


export default class GeminiAPI {
  private readonly model: string = 'gemini-2.0-flash-exp';
  private ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


    constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY не найден в переменных окружения');
    }
  }

  // Основная функция для вызова Gemini API
  async callGeminiAPI(promptData: PromptData, language: string): Promise<string> {
    try {
      const { interpreter, dreamText, answers } = promptData;
      
      // Формируем промпт для анализа сна
      const prompt = this.buildPrompt(language, dreamText, answers);

      const config: GenerateContentConfig = {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          httpOptions: {
              timeout: 30000, // 30 секунд таймаут
                  headers: {
                    'Content-Type': 'application/json',
                  },
          },
        };

      console.log('Отправка запроса к Gemini API...');

      const response = await this.ai.models.generateContent({
          model: this.model,
          contents: prompt,
          config,
      });

      // Проверяем ответ
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('Некорректный ответ от Gemini API');
      }

      Logger.log('[gemini]', `${response.text?.substring(0, 200)} --> prompt:${response.usageMetadata?.promptTokenCount} + candidates:${response.usageMetadata?.candidatesTokenCount} = total:${response.usageMetadata?.totalTokenCount}`);
      // Ограничиваем длину ответа для Telegram (максимум 4096 символов)
      return TextFormatter.truncateText(response.text || '', 4000);
      
    } catch (error) {
      console.error('Ошибка при вызове Gemini API:', error);
      throw new Error('Произошла ошибка при обращении к AI.');
    }
  }

  // Построение промпта для анализа сна
  buildPrompt(language: string, dreamText: string, answers: string[]): string {
      const interpreterNames = {
          miller: 'Миллера',
          freud: 'Фрейда',
          tsvetkov: 'Цветкова',
          loff: 'Лоффа',
          kant: 'Канта',
          jung: 'Юнга',
      };

      const keys = Object.keys(interpreterNames) as (keyof typeof interpreterNames)[];
      const randomKey = keys[Math.floor(Math.random() * keys.length)];

      const interpreterName = interpreterNames[randomKey];
      console.log(`[gemini] selected interpreter: ${randomKey}`);
    const promptTemplate = ctx.i18n.t("dreamPrompt", { dream: dreamText });
    let prompt = promptTemplate;
    // let prompt = `Ты - эксперт по толкованию снов в стиле сонника Миллера, Фрейда, Цветкова, Лоффа.

    // Проанализируй следующий сон и дай подробное толкование в соответствии с методикой и подходом сонника, наиболее подходящим для данного сна:

    // **Описание сна:**
    // ${dreamText}

    // **Дополнительная информация:**`;

    // Добавляем ответы на вопросы
    const questions = [
      'Эмоции во сне',
      'Преобладающий цвет', 
      'Другие персонажи',
      'Место действия',
      'Самое удивительное'
    ];

    answers.forEach((answer, index) => {
      if (answer && answer.trim() && index < questions.length) {
        prompt += `\n- ${questions[index]}: ${answer}`;
      }
    });


    const requirements = ctx.i18n.t("dreamRequirements");
    prompt += requirements;
    // prompt += `\n\n**Требования к толкованию:**
    // 1. Используй методологию и стиль выбраного тобой сонника
    // 2. Дай развернутое объяснение символов и их значений.
    // 3. Объясни возможную связь с реальной жизнью человека
    // 4. Предложи практические советы или выводы
    // 5. Ответ должен быть структурированным и понятным
    // 6. Ответ должен быть максимально полезным, цеплять и побуждать снова образаться к тебе со следующим сном
    // 7. Как опытный маркетолог ты должен продать свой ответ
    // 8. Длина ответа не должна превышать 3500 символов
    // 9. Ответ должен быть на ${language} языке.
    // `;

    return prompt;
  }

  // Проверка доступности API
  async checkAPIHealth() {
    try {
      const testPrompt: PromptData = {
        interpreter: 'miller',
        dreamText: 'Я видел во сне собаку.',
        answers: ['радость', 'коричневый', 'никого', 'дом', 'собака говорила']
      };
      
      // await this.callGeminiAPI(testPrompt);
      return true;
    } catch (error) {
      console.error('API Health Check Failed:', (error as Error).message);
      return false;
    }
  }
}
