const axios = require('axios');

class GeminiAPI {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY не найден в переменных окружения');
    }
  }

  // Основная функция для вызова Gemini API
  async callGeminiAPI(promptData) {
    try {
      const { interpreter, dreamText, answers } = promptData;
      
      // Формируем промпт для анализа сна
      const prompt = this.buildPrompt(interpreter, dreamText, answers);
      
      const requestData = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      };

      console.log('Отправка запроса к Gemini API...');
      
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000 // 30 секунд таймаут
        }
      );

      // Проверяем ответ
      if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
        throw new Error('Некорректный ответ от Gemini API');
      }

      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Ограничиваем длину ответа для Telegram (максимум 4096 символов)
      return this.truncateText(generatedText, 4000);
      
    } catch (error) {
      console.error('Ошибка при вызове Gemini API:', error);
      
      if (error.response) {
        console.error('Ответ сервера:', error.response.status, error.response.data);
        
        if (error.response.status === 429) {
          throw new Error('Превышен лимит запросов к AI. Попробуйте позже.');
        } else if (error.response.status === 401) {
          throw new Error('Ошибка аутентификации AI сервиса.');
        } else {
          throw new Error('Сервис AI временно недоступен.');
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Превышено время ожидания ответа от AI.');
      } else {
        throw new Error('Произошла ошибка при обращении к AI.');
      }
    }
  }

  // Построение промпта для анализа сна
  buildPrompt(interpreter, dreamText, answers) {
    const interpreterNames = {
      miller: 'Миллера',
      freud: 'Фрейда', 
      tsvetkov: 'Цветкова',
      loff: 'Лоффа'
    };

    const interpreterName = interpreterNames[interpreter] || 'неизвестного';
    
    let prompt = `Ты - эксперт по толкованию снов в стиле сонника ${interpreterName}.

Проанализируй следующий сон и дай подробное толкование в соответствии с методикой и подходом ${interpreterName}:

**Описание сна:**
${dreamText}

**Дополнительная информация:**`;

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

    prompt += `\n\n**Требования к толкованию:**
1. Используй методологию и стиль ${interpreterName}
2. Дай развернутое объяснение символов и их значений
3. Объясни возможную связь с реальной жизнью человека
4. Предложи практические советы или выводы
5. Ответ должен быть структурированным и понятным
6. Длина ответа не должна превышать 3500 символов
7. Пиши на русском языке

Начинай ответ с упоминания сонника ${interpreterName}.`;

    return prompt;
  }

  // Обрезка текста до указанной длины
  truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Обрезаем по словам, чтобы не разрывать предложения
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }

  // Проверка доступности API
  async checkAPIHealth() {
    try {
      const testPrompt = {
        interpreter: 'miller',
        dreamText: 'Я видел во сне собаку.',
        answers: ['радость', 'коричневый', 'никого', 'дом', 'собака говорила']
      };
      
      await this.callGeminiAPI(testPrompt);
      return true;
    } catch (error) {
      console.error('API Health Check Failed:', error.message);
      return false;
    }
  }
}

module.exports = GeminiAPI;