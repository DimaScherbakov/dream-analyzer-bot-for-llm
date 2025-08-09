// A collection of constants used throughout the Dream Analyzer Bot.
// Most of these come directly from the original implementation. Only the
// LANG enumeration is required by the grammY rewrite. The remaining values
// are preserved for completeness and future extension.

import path from 'node:path';
import os from 'node:os';

// Dream interpreters and their descriptions. These are currently unused in
// the minimal grammY implementation but left here for future use.
export const DREAM_INTERPRETERS: Record<string, { name: string; description: string }> = {
  miller: {
    name: 'Сонник Миллера',
    description: `📖 **Сонник Миллера**\n\nГустав Хиндман Миллер - американский психолог и автор одного из самых популярных сонников. Его толкования основаны на психологическом анализе и жизненном опыте.\n\nМиллер считал, что сны отражают наши подсознательные страхи, желания и предчувствия о будущем. Его подход сочетает практическую психологию с символическим анализом.`,
  },
  freud: {
    name: 'Сонник Фрейда',
    description: `🧠 **Сонник Фрейда**\n\nЗигмунд Фрейд - основатель психоанализа, который революционизировал понимание сновидений. Согласно его теории, сны - это "королевская дорога к бессознательному".\n\nФрейд считал, что сны представляют подавленные желания и конфликты, особенно связанные с детством и сексуальностью. Его метод основан на свободных ассоциациях и символическом анализе.`,
  },
  tsvetkov: {
    name: 'Сонник Цветкова',
    description: `🔮 **Сонник Цветкова**\n\nЕвгений Петрович Цветков - русский толкователь снов, создавший один из самых подробных современных сонников. Его подход сочетает традиционные народные верования с современной психологией.\n\nЦветков уделяет особое внимание деталям сна и их символическому значению. Его толкования часто связаны с предсказанием будущих событий и пониманием внутреннего состояния человека.`,
  },
  loff: {
    name: 'Сонник Лоффа',
    description: `💭 **Сонник Лоффа**\n\nДэвид Лофф - современный психолог и исследователь сновидений. Его подход основан на персональном анализе снов с учетом индивидуальных особенностей сновидца.\n\nЛофф считает, что каждый сон уникален и должен интерпретироваться в контексте жизни конкретного человека. Он уделяет большое внимание эмоциям и личным ассоциациям.`,
  },
  kant: {
    name: 'Сонник Канта',
    description: `💭 **Сонник Канта**\n\nИммануил Кант рассматривал сны как игры воображения и продукты расстроенного разума, а не как источник глубоких истин или пророчеств. Для него, как для философа-рационалиста, сновидения были скорее иллюзиями, демонстрирующими отсутствие строгого контроля разума в состоянии сна.\n\nОн анализировал сны с точки зрения их иррациональности, а не мистических предсказаний.`,
  },
  jung: {
    name: 'Сонник Юнга',
    description: `💭 **Сонник Юнга**\n\nКарл Юнг видел в снах глубоко значимые послания из бессознательного, а не случайные образы. Для него сновидения были символическими выражениями внутренних конфликтов и путей к индивидуации – процессу становления целостной личностью. Юнг выделял личное и коллективное бессознательное (с его архетипами), которые проявляются во снах, стремясь к психологическому балансу.\n\nЕго подход к интерпретации фокусировался на диалоге с бессознательным и понимании символов в контексте всей психической жизни человека.`,
  },
};

// Clarifying questions for dream analysis. These remain unused in the minimal
// grammY version but are included for completeness.
export const CLARIFYING_QUESTIONS = [
  'Какие эмоции вы испытывали во сне? (1-5 слов)',
  'Где происходило действие сна? (1-5 слов)',
  'Что вас больше всего удивило во сне? (1-5 слов)',
];

// Possible user states during a session. The minimal version only utilises
// a simplified state machine, but these constants are preserved.
export const USER_STATES = {
  WAITING_INTERPRETER: 'waiting_interpreter',
  WAITING_DREAM: 'waiting_dream',
  ASKING_QUESTIONS: 'asking_questions',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const;

// Compute a path to the user-specific data directory. This function is left
// unused in the grammY rewrite but remains here for reference.
const userDataPath = (): string => {
  const appName = 'dream-analyzer-bot';
  const getUserDataPath = () => {
    switch (process.platform) {
      case 'win32':
        return path.join(os.homedir(), 'AppData', 'Roaming', appName);
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', appName);
      case 'linux':
        return path.join(os.homedir(), '.config', appName);
      default:
        throw new Error('Unsupported platform!');
    }
  };
  return getUserDataPath();
};

// Directory used for logging. Not utilised by the grammY bot but kept for
// backward compatibility.
export const LOG_FOLDER = `${userDataPath()}/logs`;

// Supported UI languages. These values are referenced in the session state
// and translation table.
export enum LANG {
  UK = 'uk',
  RU = 'ru',
}